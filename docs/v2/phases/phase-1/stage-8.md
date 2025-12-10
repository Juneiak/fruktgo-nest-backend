# Этап 1.8: COMMUNICATIONS (Уведомления)

## Краткое содержание

Модуль уведомлений: Telegram Bot, SMS (OTP), шаблоны сообщений, очередь отправки через BullMQ.

## Предполагаемый результат

- Telegram уведомления работают
- SMS для OTP отправляется
- Шаблоны сообщений готовы
- Очередь отправки через BullMQ

---

## 1. Структура модуля

```
src/infra/communications/
├── index.ts
├── communications.module.ts
├── communications.port.ts
├── communications.service.ts
├── communications.enums.ts
├── channels/
│   ├── telegram/
│   │   ├── telegram.service.ts
│   │   └── telegram.types.ts
│   └── sms/
│       ├── sms.service.ts
│       └── sms.adapter.ts
├── templates/
│   ├── templates.service.ts
│   └── templates/
│       ├── order-created.ts
│       ├── order-status.ts
│       ├── otp.ts
│       └── ...
└── queue/
    ├── notification.processor.ts
    └── notification.types.ts
```

---

## 2. Enums

```typescript
// src/infra/communications/communications.enums.ts

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  SMS = 'sms',
  EMAIL = 'email',      // Фаза 3+
  PUSH = 'push',        // Фаза 3+
}

export enum NotificationPriority {
  HIGH = 'high',        // OTP, payment
  NORMAL = 'normal',    // Order status
  LOW = 'low',          // Marketing
}

export enum NotificationType {
  // Auth
  OTP = 'otp',
  
  // Orders
  ORDER_CREATED = 'order_created',
  ORDER_PAID = 'order_paid',
  ORDER_ASSEMBLING = 'order_assembling',
  ORDER_READY = 'order_ready',
  ORDER_DELIVERING = 'order_delivering',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  
  // Delivery
  COURIER_ASSIGNED = 'courier_assigned',
  COURIER_ARRIVED = 'courier_arrived',
  
  // Shift
  NEW_ORDER_FOR_SHIFT = 'new_order_for_shift',
  SHIFT_REMINDER = 'shift_reminder',
  
  // System
  LOW_STOCK_ALERT = 'low_stock_alert',
}
```

---

## 3. Communications Port

```typescript
// src/infra/communications/communications.port.ts
import { NotificationChannel, NotificationType, NotificationPriority } from './communications.enums';

export const COMMUNICATIONS_PORT = Symbol('COMMUNICATIONS_PORT');

export interface CommunicationsPort {
  /**
   * Отправить уведомление
   */
  send(notification: SendNotificationDto): Promise<void>;

  /**
   * Отправить SMS (для OTP)
   */
  sendSms(params: SendSmsDto): Promise<void>;

  /**
   * Отправить Telegram сообщение
   */
  sendTelegram(params: SendTelegramDto): Promise<void>;

  /**
   * Отправить уведомление группе (например, всем сотрудникам магазина)
   */
  sendToGroup(notification: SendGroupNotificationDto): Promise<void>;
}

export interface SendNotificationDto {
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  recipient: {
    phone?: string;
    telegramId?: number;
    email?: string;
  };
  data: Record<string, any>; // Данные для шаблона
}

export interface SendSmsDto {
  phone: string;
  message: string;
}

export interface SendTelegramDto {
  telegramId: number;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  buttons?: TelegramButton[];
}

export interface TelegramButton {
  text: string;
  url?: string;
  callbackData?: string;
}

export interface SendGroupNotificationDto {
  type: NotificationType;
  channel: NotificationChannel;
  recipients: Array<{
    phone?: string;
    telegramId?: number;
  }>;
  data: Record<string, any>;
}
```

---

## 4. Templates

```typescript
// src/infra/communications/templates/templates.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationType } from '../communications.enums';

@Injectable()
export class TemplatesService {
  private templates: Map<NotificationType, TemplateRenderer> = new Map();

  constructor() {
    this.registerTemplates();
  }

  private registerTemplates() {
    // OTP
    this.templates.set(NotificationType.OTP, {
      sms: (data) => `FruktGo: Ваш код ${data.code}. Не сообщайте никому.`,
      telegram: (data) => `🔐 Ваш код для входа: <b>${data.code}</b>\n\nДействует 5 минут.`,
    });

    // Order Created
    this.templates.set(NotificationType.ORDER_CREATED, {
      telegram: (data) => `
🛒 <b>Новый заказ #${data.orderNumber}</b>

📍 ${data.shopName}
💰 ${data.total} ₸

Ожидайте подтверждения.
      `.trim(),
    });

    // Order Paid (for shop)
    this.templates.set(NotificationType.ORDER_PAID, {
      telegram: (data) => `
📦 <b>Заказ #${data.orderNumber} оплачен!</b>

👤 ${data.customerName}
📍 ${data.deliveryAddress}
💰 ${data.total} ₸

${data.items.map(i => `• ${i.name} × ${i.quantity}`).join('\n')}
      `.trim(),
    });

    // Order Delivering
    this.templates.set(NotificationType.ORDER_DELIVERING, {
      telegram: (data) => `
🚗 <b>Заказ #${data.orderNumber} в пути!</b>

Курьер: ${data.courierName}
${data.courierPhone ? `📞 ${data.courierPhone}` : ''}

Ожидаемое время: ${data.estimatedTime}
      `.trim(),
    });

    // Order Delivered
    this.templates.set(NotificationType.ORDER_DELIVERED, {
      telegram: (data) => `
✅ <b>Заказ #${data.orderNumber} доставлен!</b>

Спасибо за покупку! 🙏

Оцените заказ:
      `.trim(),
    });

    // Courier Assigned
    this.templates.set(NotificationType.COURIER_ASSIGNED, {
      telegram: (data) => `
🚗 <b>Назначена доставка!</b>

Заказ: #${data.orderNumber}
Адрес: ${data.deliveryAddress}
Клиент: ${data.customerName}
${data.customerPhone ? `📞 ${data.customerPhone}` : ''}
      `.trim(),
    });

    // New Order for Shift
    this.templates.set(NotificationType.NEW_ORDER_FOR_SHIFT, {
      telegram: (data) => `
🔔 <b>Новый заказ!</b>

#${data.orderNumber}
💰 ${data.total} ₸
📦 ${data.itemsCount} позиций

Примите заказ в приложении.
      `.trim(),
    });

    // Low Stock Alert
    this.templates.set(NotificationType.LOW_STOCK_ALERT, {
      telegram: (data) => `
⚠️ <b>Низкий остаток!</b>

${data.productName}
Осталось: ${data.quantity} ${data.unit}

Пополните запасы.
      `.trim(),
    });
  }

  render(type: NotificationType, channel: 'sms' | 'telegram' | 'email', data: Record<string, any>): string {
    const template = this.templates.get(type);
    if (!template || !template[channel]) {
      throw new Error(`Template not found: ${type}/${channel}`);
    }
    return template[channel](data);
  }
}

interface TemplateRenderer {
  sms?: (data: any) => string;
  telegram?: (data: any) => string;
  email?: (data: any) => string;
}
```

---

## 5. Telegram Service

```typescript
// src/infra/communications/channels/telegram/telegram.service.ts
import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { SendTelegramDto } from '../../communications.port';

@Injectable()
export class TelegramService {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  }

  async send(params: SendTelegramDto): Promise<void> {
    const { telegramId, message, parseMode, buttons } = params;

    const options: any = {
      parse_mode: parseMode || 'HTML',
    };

    if (buttons && buttons.length > 0) {
      options.reply_markup = {
        inline_keyboard: [
          buttons.map(btn => ({
            text: btn.text,
            url: btn.url,
            callback_data: btn.callbackData,
          })),
        ],
      };
    }

    try {
      await this.bot.telegram.sendMessage(telegramId, message, options);
    } catch (error) {
      console.error(`Failed to send Telegram message to ${telegramId}:`, error.message);
      throw error;
    }
  }

  async sendPhoto(telegramId: number, photoUrl: string, caption?: string): Promise<void> {
    await this.bot.telegram.sendPhoto(telegramId, photoUrl, {
      caption,
      parse_mode: 'HTML',
    });
  }
}
```

---

## 6. SMS Service

```typescript
// src/infra/communications/channels/sms/sms.service.ts
import { Injectable } from '@nestjs/common';
import { SendSmsDto } from '../../communications.port';

@Injectable()
export class SmsService {
  private readonly provider = process.env.SMS_PROVIDER || 'log'; // log, smsc, mobizon

  async send(params: SendSmsDto): Promise<void> {
    const { phone, message } = params;

    switch (this.provider) {
      case 'log':
        // Для разработки — просто логируем
        console.log(`[SMS → ${phone}]: ${message}`);
        break;
      
      case 'smsc':
        await this.sendViaSMSC(phone, message);
        break;
      
      default:
        console.log(`[SMS → ${phone}]: ${message}`);
    }
  }

  private async sendViaSMSC(phone: string, message: string): Promise<void> {
    const axios = require('axios');
    const login = process.env.SMSC_LOGIN;
    const password = process.env.SMSC_PASSWORD;
    const sender = process.env.SMSC_SENDER || 'FruktGo';

    await axios.get('https://smsc.kz/sys/send.php', {
      params: {
        login,
        psw: password,
        phones: phone,
        mes: message,
        sender,
        charset: 'utf-8',
      },
    });
  }
}
```

---

## 7. Notification Processor (BullMQ)

```typescript
// src/infra/communications/queue/notification.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { TelegramService } from '../channels/telegram/telegram.service';
import { SmsService } from '../channels/sms/sms.service';
import { TemplatesService } from '../templates/templates.service';
import { NotificationChannel } from '../communications.enums';

@Processor('notifications')
@Injectable()
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly smsService: SmsService,
    private readonly templatesService: TemplatesService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { type, channel, recipient, data } = job.data;

    switch (channel) {
      case NotificationChannel.TELEGRAM:
        if (!recipient.telegramId) {
          console.warn(`No telegramId for notification ${type}`);
          return;
        }
        const tgMessage = this.templatesService.render(type, 'telegram', data);
        await this.telegramService.send({
          telegramId: recipient.telegramId,
          message: tgMessage,
        });
        break;

      case NotificationChannel.SMS:
        if (!recipient.phone) {
          console.warn(`No phone for notification ${type}`);
          return;
        }
        const smsMessage = this.templatesService.render(type, 'sms', data);
        await this.smsService.send({
          phone: recipient.phone,
          message: smsMessage,
        });
        break;

      default:
        console.warn(`Unknown channel: ${channel}`);
    }
  }
}

interface NotificationJobData {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: {
    phone?: string;
    telegramId?: number;
    email?: string;
  };
  data: Record<string, any>;
}
```

---

## 8. Communications Service

```typescript
// src/infra/communications/communications.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  CommunicationsPort,
  SendNotificationDto,
  SendSmsDto,
  SendTelegramDto,
  SendGroupNotificationDto,
} from './communications.port';
import { NotificationPriority } from './communications.enums';
import { TelegramService } from './channels/telegram/telegram.service';
import { SmsService } from './channels/sms/sms.service';

@Injectable()
export class CommunicationsService implements CommunicationsPort {
  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private readonly telegramService: TelegramService,
    private readonly smsService: SmsService,
  ) {}

  async send(notification: SendNotificationDto): Promise<void> {
    const priority = this.getPriorityValue(notification.priority);

    await this.notificationQueue.add(
      notification.type,
      notification,
      {
        priority,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    );
  }

  async sendSms(params: SendSmsDto): Promise<void> {
    // SMS отправляем напрямую (OTP требует мгновенной доставки)
    await this.smsService.send(params);
  }

  async sendTelegram(params: SendTelegramDto): Promise<void> {
    await this.telegramService.send(params);
  }

  async sendToGroup(notification: SendGroupNotificationDto): Promise<void> {
    const jobs = notification.recipients.map(recipient => ({
      name: notification.type,
      data: {
        type: notification.type,
        channel: notification.channel,
        recipient,
        data: notification.data,
      },
    }));

    await this.notificationQueue.addBulk(jobs);
  }

  private getPriorityValue(priority?: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.HIGH: return 1;
      case NotificationPriority.NORMAL: return 2;
      case NotificationPriority.LOW: return 3;
      default: return 2;
    }
  }
}
```

---

## 9. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| AUTH | ← | Отправка OTP |
| ORDERS | ← | Уведомления о статусах заказа |
| LOGISTICS | ← | Уведомления о доставке |
| WORKFORCE | ← | Уведомления сотрудникам |
| INVENTORY | ← | Алерты о низком остатке |

---

## 10. Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_SELLER_BOT_TOKEN=...

# SMS
SMS_PROVIDER=log  # log, smsc, mobizon
SMSC_LOGIN=...
SMSC_PASSWORD=...
SMSC_SENDER=FruktGo
```

---

## Чеклист готовности

- [ ] Telegram сообщения отправляются
- [ ] SMS для OTP работает
- [ ] Шаблоны для основных событий готовы
- [ ] Очередь через BullMQ работает
- [ ] Retry при ошибках работает
- [ ] Групповая отправка работает
