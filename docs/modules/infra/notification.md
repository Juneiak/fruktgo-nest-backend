# Notification Infrastructure Module

> **Модуль:** `src/infra/notification`  
> **Назначение:** Мультиканальная система уведомлений (Push, Email, SMS, Telegram)

---

## 1. Обзор

Централизованная система отправки уведомлений пользователям через различные каналы.

**Основные возможности:**
- **Мультиканальность:** Push, Email, SMS, Telegram, In-App
- **Приоритеты:** URGENT, HIGH, MEDIUM, LOW
- **Типы уведомлений:** заказы, финансы, смены, система
- **Персонализация:** шаблоны, переменные, локализация
- **Отслеживание:** статусы доставки, подтверждения прочтения
- **Настройки пользователя:** отключение каналов/типов, DND режим

**Поддерживаемые каналы:**
- **Telegram Bot** - основной канал для Customer/Seller/Employee
- **Push Notifications** - мобильные приложения (FCM)
- **SMS** - критичные уведомления
- **Email** - отчёты, рассылки
- **In-App** - внутри веб-приложения

---

## 2. Схема данных

### Notification Schema

```typescript
{
  _id: ObjectId,
  
  // Получатель
  recipientType: UserType,    // CUSTOMER | SELLER | EMPLOYEE | ADMIN
  recipientId: ObjectId,
  
  // Тип и содержание
  type: NotificationType,     // ORDER_CREATED, PAYMENT_RECEIVED и т.д.
  title: string,              // Заголовок (до 200 символов)
  message: string,            // Текст (до 1000 символов)
  
  // Приоритет
  priority: NotificationPriority,  // LOW | MEDIUM | HIGH | URGENT
  
  // Статус
  status: NotificationStatus,      // UNREAD | READ | ARCHIVED
  readAt?: Date,
  
  // Дополнительные данные
  payload?: {                 // JSON данные для deep links
    orderId?: string,
    shopId?: string,
    amount?: number,
    // и т.д.
  },
  
  // Каналы доставки
  channels: {
    telegram?: {
      sent: boolean,
      messageId?: number,
      sentAt?: Date,
      error?: string
    },
    push?: {
      sent: boolean,
      sentAt?: Date,
      error?: string
    },
    sms?: {
      sent: boolean,
      sentAt?: Date,
      error?: string
    },
    email?: {
      sent: boolean,
      sentAt?: Date,
      error?: string
    }
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Индексы:**
```typescript
{ recipientType: 1, recipientId: 1, status: 1, createdAt: -1 }  // Лента уведомлений
{ type: 1, createdAt: -1 }                                      // Поиск по типу
{ priority: 1, status: 1 }                                      // Срочные непрочитанные
```

---

## 3. Енумы

### NotificationType

Типы уведомлений:

```typescript
enum NotificationType {
  // Заказы
  ORDER_CREATED = 'order_created',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_CANCELLED = 'order_cancelled',
  
  // Финансы
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_FAILED = 'payment_failed',
  WITHDRAWAL_APPROVED = 'withdrawal_approved',
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',
  PENALTY_APPLIED = 'penalty_applied',
  
  // Аккаунт
  ACCOUNT_VERIFIED = 'account_verified',
  ACCOUNT_BLOCKED = 'account_blocked',
  
  // Смены
  SHIFT_STARTED = 'shift_started',
  SHIFT_ENDED = 'shift_ended',
  
  // Склад
  PRODUCT_OUT_OF_STOCK = 'product_out_of_stock',
  
  // Магазин
  SHOP_STATUS_CHANGED = 'shop_status_changed',
  
  // Поддержка
  SUPPORT_TICKET_UPDATED = 'support_ticket_updated',
  
  // Система
  SYSTEM_MAINTENANCE = 'system_maintenance',
  PROMOTIONAL = 'promotional',
  GENERAL = 'general'
}
```

### NotificationPriority

Приоритеты уведомлений:

```typescript
enum NotificationPriority {
  LOW = 'low',        // Информационные, можно отложить
  MEDIUM = 'medium',  // Стандартные
  HIGH = 'high',      // Важные, требуют внимания
  URGENT = 'urgent'   // Критичные, немедленная доставка
}
```

**Стратегии доставки:**
- `URGENT` → все каналы + повторы при неудаче
- `HIGH` → Telegram + Push + SMS
- `MEDIUM` → Telegram + Push
- `LOW` → только In-App (или дайджест)

### NotificationStatus

Статусы уведомлений:

```typescript
enum NotificationStatus {
  UNREAD = 'unread',      // Не прочитано
  READ = 'read',          // Прочитано
  ARCHIVED = 'archived'   // Архивировано
}
```

---

## 4. Commands (Write операции)

### SendNotificationCommand

Отправка уведомления:

```typescript
class SendNotificationCommand {
  recipientType: UserType,
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  priority?: NotificationPriority,  // default: MEDIUM
  channels?: NotificationChannel[], // default: [TELEGRAM, PUSH]
  payload?: Record<string, any>
}
```

**Пример:**
```typescript
await notificationPort.send(
  new SendNotificationCommand({
    recipientType: UserType.CUSTOMER,
    recipientId: customerId,
    type: NotificationType.ORDER_CREATED,
    title: 'Заказ создан',
    message: 'Ваш заказ #1234 успешно создан и ожидает оплаты',
    priority: NotificationPriority.HIGH,
    channels: [NotificationChannel.TELEGRAM, NotificationChannel.PUSH],
    payload: {
      orderId: '1234',
      amount: 1500
    }
  })
);
```

### MarkAsReadCommand

Отметить как прочитанное:

```typescript
class MarkAsReadCommand {
  notificationId: string
}
```

---

## 5. Queries (Read операции)

### GetUserNotificationsQuery

Получение уведомлений пользователя:

```typescript
class GetUserNotificationsQuery {
  recipientType: UserType,
  recipientId: string,
  status?: NotificationStatus,  // Фильтр по статусу
  type?: NotificationType,      // Фильтр по типу
  page?: number,
  limit?: number
}
```

**Возвращает:** `PaginateResult<Notification>`

---

## 6. Port (Интерфейс)

```typescript
interface NotificationPort {
  // Commands
  send(command: SendNotificationCommand): Promise<Notification>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  archive(notificationId: string): Promise<void>;
  
  // Queries
  getUserNotifications(query: GetUserNotificationsQuery): Promise<PaginateResult<Notification>>;
  getUnreadCount(userId: string): Promise<number>;
}

const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');
```

---

## 7. Service (Бизнес-логика)

### NotificationService

**Основные методы:**

#### `send(command)`

```typescript
async send(command: SendNotificationCommand): Promise<Notification> {
  // 1. Создание уведомления в БД
  const notification = await this.notificationModel.create({
    recipientType: command.recipientType,
    recipientId: command.recipientId,
    type: command.type,
    title: command.title,
    message: command.message,
    priority: command.priority || NotificationPriority.MEDIUM,
    payload: command.payload,
    status: NotificationStatus.UNREAD
  });
  
  // 2. Определение каналов на основе приоритета
  const channels = command.channels || this.getDefaultChannels(command.priority);
  
  // 3. Отправка через каналы
  await Promise.allSettled([
    this.sendTelegram(notification, command.recipientId),
    this.sendPush(notification, command.recipientId),
    this.sendEmail(notification, command.recipientId),
    this.sendSMS(notification, command.recipientId)
  ]);
  
  // 4. WebSocket для real-time
  this.eventEmitter.emit('notification.sent', {
    notification,
    userId: command.recipientId
  });
  
  return notification;
}
```

#### `sendTelegram(notification, userId)`

```typescript
async sendTelegram(notification: Notification, userId: string) {
  try {
    const user = await this.getUserTelegramId(userId);
    if (!user.telegramId) return;
    
    const result = await this.telegramBot.sendMessage(user.telegramId, {
      text: `${notification.title}\n\n${notification.message}`,
      parse_mode: 'HTML',
      reply_markup: this.buildInlineKeyboard(notification)
    });
    
    await this.notificationModel.updateOne(
      { _id: notification._id },
      {
        'channels.telegram.sent': true,
        'channels.telegram.messageId': result.message_id,
        'channels.telegram.sentAt': new Date()
      }
    );
  } catch (error) {
    await this.notificationModel.updateOne(
      { _id: notification._id },
      { 'channels.telegram.error': error.message }
    );
  }
}
```

#### `getDefaultChannels(priority)`

```typescript
getDefaultChannels(priority: NotificationPriority): NotificationChannel[] {
  switch (priority) {
    case NotificationPriority.URGENT:
      return [TELEGRAM, PUSH, SMS, EMAIL];
    case NotificationPriority.HIGH:
      return [TELEGRAM, PUSH, SMS];
    case NotificationPriority.MEDIUM:
      return [TELEGRAM, PUSH];
    case NotificationPriority.LOW:
      return [PUSH];
  }
}
```

---

## 8. Providers (Интеграции)

### TelegramBotProvider

Отправка через Telegram Bot API:

```typescript
@Injectable()
export class TelegramBotProvider {
  constructor(
    @Inject(TELEGRAM_BOT_TOKEN) private readonly botToken: string
  ) {}

  async sendMessage(chatId: number, options: {
    text: string,
    parse_mode?: 'HTML' | 'Markdown',
    reply_markup?: InlineKeyboard
  }) {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      ...options
    });
    
    return response.data.result;
  }
}
```

### PushNotificationProvider (FCM)

```typescript
@Injectable()
export class PushNotificationProvider {
  constructor(
    @Inject(FCM_CONFIG) private readonly fcmConfig: any
  ) {}

  async send(token: string, notification: {
    title: string,
    body: string,
    data?: Record<string, any>
  }) {
    await admin.messaging().send({
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data,
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } }
    });
  }
}
```

### EmailProvider (SMTP/SendGrid)

```typescript
@Injectable()
export class EmailProvider {
  constructor(
    @Inject(SMTP_CONFIG) private readonly smtpConfig: any
  ) {}

  async send(to: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport(this.smtpConfig);
    
    await transporter.sendMail({
      from: 'noreply@fruktgo.kz',
      to,
      subject,
      html
    });
  }
}
```

### SMSProvider (SMS.ru/Twilio)

```typescript
@Injectable()
export class SMSProvider {
  async send(phone: string, message: string) {
    await axios.post('https://sms.ru/sms/send', {
      api_id: process.env.SMS_RU_API_ID,
      to: phone,
      msg: message,
      json: 1
    });
  }
}
```

---

## 9. Использование

### Отправка уведомления о заказе

```typescript
import { NotificationPort, NOTIFICATION_PORT } from 'src/infra/notification';
import { NotificationType, NotificationPriority } from 'src/infra/notification/notification.schema';

@Injectable()
export class OrderService {
  constructor(
    @Inject(NOTIFICATION_PORT) private readonly notificationPort: NotificationPort,
  ) {}

  async createOrder(command: CreateOrderCommand) {
    const order = await this.orderModel.create(command);
    
    // Уведомление клиенту
    await this.notificationPort.send({
      recipientType: UserType.CUSTOMER,
      recipientId: order.customerId,
      type: NotificationType.ORDER_CREATED,
      title: 'Заказ создан',
      message: `Ваш заказ #${order.orderNumber} успешно создан. Ожидаем оплату.`,
      priority: NotificationPriority.HIGH,
      payload: {
        orderId: order._id,
        amount: order.totalAmount
      }
    });
    
    // Уведомление магазину
    await this.notificationPort.send({
      recipientType: UserType.SELLER,
      recipientId: order.sellerId,
      type: NotificationType.ORDER_CREATED,
      title: 'Новый заказ',
      message: `Получен новый заказ #${order.orderNumber} на сумму ${order.totalAmount}₽`,
      priority: NotificationPriority.URGENT,
      payload: {
        orderId: order._id,
        shopId: order.shopId
      }
    });
    
    return order;
  }
}
```

### Получение непрочитанных уведомлений

```typescript
@Injectable()
export class CustomerNotificationsRoleService {
  constructor(
    @Inject(NOTIFICATION_PORT) private readonly notificationPort: NotificationPort,
  ) {}

  async getUnreadNotifications(customerId: string) {
    return await this.notificationPort.getUserNotifications({
      recipientType: UserType.CUSTOMER,
      recipientId: customerId,
      status: NotificationStatus.UNREAD,
      page: 1,
      limit: 20
    });
  }

  async getUnreadCount(customerId: string) {
    return await this.notificationPort.getUnreadCount(customerId);
  }
}
```

### HTTP Controller

```typescript
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NOTIFICATION_PORT) private readonly notificationPort: NotificationPort,
  ) {}

  @Get()
  async getNotifications(
    @AuthUser() user: AuthenticatedUser,
    @Query() query: { page?: number, limit?: number, status?: NotificationStatus }
  ) {
    return await this.notificationPort.getUserNotifications({
      recipientType: user.role,
      recipientId: user.id,
      ...query
    });
  }

  @Get('unread/count')
  async getUnreadCount(@AuthUser() user: AuthenticatedUser) {
    const count = await this.notificationPort.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationPort.markAsRead(id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@AuthUser() user: AuthenticatedUser) {
    await this.notificationPort.markAllAsRead(user.id);
    return { success: true };
  }
}
```

---

## 10. Конфигурация

### Environment Variables

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CUSTOMER_BOT_TOKEN=...
TELEGRAM_SELLER_BOT_TOKEN=...

# Firebase Cloud Messaging
FCM_PROJECT_ID=fruktgo-app
FCM_PRIVATE_KEY=...
FCM_CLIENT_EMAIL=...

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fruktgo.kz
SMTP_PASSWORD=...

# SMS
SMS_PROVIDER=sms.ru  # sms.ru | twilio
SMS_RU_API_ID=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

---

## 11. Real-time Updates (WebSocket)

### Event Emitter

```typescript
@OnEvent('notification.sent')
handleNotificationSent(event: { notification: Notification, userId: string }) {
  // Отправить через WebSocket для real-time обновления
  this.wsGateway.sendToUser(event.userId, {
    type: 'notification',
    data: event.notification
  });
}
```

### WebSocket Gateway

```typescript
@WebSocketGateway()
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  sendToUser(userId: string, data: any) {
    this.server.to(`user:${userId}`).emit('notification', data);
  }
}
```

### Client (Frontend)

```typescript
// Подключение к WebSocket
const socket = io('wss://api.fruktgo.kz');

socket.on('notification', (notification) => {
  // Показать toast/banner
  showNotification(notification);
  
  // Обновить счётчик непрочитанных
  updateBadge();
});
```

---

## 12. Best Practices

### 1. Используйте правильные приоритеты

```typescript
// ✅ Хорошо
NotificationPriority.URGENT - критичные (оплата не прошла, заказ отменён)
NotificationPriority.HIGH - важные (новый заказ, смена началась)
NotificationPriority.MEDIUM - стандартные (заказ доставлен)
NotificationPriority.LOW - информационные (новые статьи)

// ❌ Плохо - всё как URGENT
```

### 2. Персонализируйте сообщения

```typescript
// ✅ Хорошо
message: `Привет, ${customer.firstName}! Ваш заказ #${order.number} доставлен.`

// ❌ Плохо
message: 'Заказ доставлен'
```

### 3. Добавляйте payload для deep links

```typescript
// ✅ Хорошо - можно перейти к заказу
payload: {
  orderId: '123',
  deepLink: '/orders/123'
}

// ❌ Плохо - нет контекста
payload: {}
```

### 4. Обрабатывайте ошибки доставки

```typescript
// Повтор отправки при неудаче (для URGENT)
if (priority === NotificationPriority.URGENT && !sent) {
  await this.retryDelivery(notification, maxRetries: 3);
}
```

---

## Заключение

Notification Module предоставляет мощную мультиканальную систему уведомлений с поддержкой приоритезации, real-time доставки и отслеживания статусов. Модуль критичен для пользовательского опыта и вовлечённости.

**Ключевые особенности:**
- Multi-channel delivery
- Priority-based routing
- Real-time WebSocket updates
- Delivery tracking
- Production-ready (retry logic, error handling)
