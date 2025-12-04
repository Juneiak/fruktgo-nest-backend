# Notification Module

> `src/infra/notification/`

Отправка уведомлений через Telegram-ботов. Единственный канал доставки — Telegram. Push/Email/SMS не реализованы.

## Структура

```
src/infra/notification/
├── notification.module.ts
├── notification.service.ts
├── notification.schema.ts       # Задел на будущее (не используется)
└── providers/
    ├── notification-providers.module.ts
    ├── telegram-admin-notification.provider.ts
    ├── telegram-customer-notification.provider.ts
    ├── telegram-seller-notification.provider.ts
    └── telegram-employee-notification.provider.ts
```

## Использование

```typescript
import { NotificationService } from 'src/infra/notification';

constructor(private readonly notificationService: NotificationService) {}
```

## API

### Admin

| Метод | Описание |
|-------|----------|
| `notifyAdmin(message)` | Отправить сообщение админам |

### Customer

| Метод | Описание |
|-------|----------|
| `notifyCustomer(telegramId, message)` | Произвольное сообщение |
| `notifyCustomerAboutOrderUpdate(orderId)` | Обновление заказа |
| `notifyCustomerAboutIssueUpdate(issueId)` | Обновление тикета |

### Seller

| Метод | Описание |
|-------|----------|
| `notifySeller(telegramId, message)` | Произвольное сообщение |
| `notifySellerAboutShiftUpdate(shiftId, haveOpened)` | Смена открыта/закрыта |
| `notifySellerAboutIssueUpdate(issueId)` | Обновление тикета |

### Employee

| Метод | Описание |
|-------|----------|
| `notifyEmployee(telegramId, message)` | Произвольное сообщение |
| `notifyEmployeeAboutNewOrder(orderId)` | Новый заказ |
| `notifyEmployeeAboutNewRequestFromSeller(telegramId, requestId)` | Запрос от селлера |
| `notifyEmployeeAboutLoginToShop(telegramId, loginCode)` | Код входа в магазин |

## Providers

| Provider | Бот | Аудитория |
|----------|-----|-----------|
| `TelegramCustomerNotificationProvider` | `@fruktgo_bot` | Клиенты |
| `TelegramSellerNotificationProvider` | `@fruktgo_seller_bot` | Продавцы |
| `TelegramEmployeeNotificationProvider` | `@fruktgo_seller_bot` | Сотрудники |
| `TelegramAdminNotificationProvider` | Admin bot | Администраторы |

## Примеры

### Уведомление об обновлении заказа

```typescript
await this.notificationService.notifyCustomerAboutOrderUpdate(orderId);
// Автоматически загружает заказ, получает telegramId клиента, отправляет
```

### Произвольное сообщение

```typescript
await this.notificationService.notifyCustomer(
  customer.telegramId,
  '🎉 Ваш заказ доставлен!'
);
```

### Уведомление сотрудника о новом заказе

```typescript
await this.notificationService.notifyEmployeeAboutNewOrder(orderId);
// Загружает заказ → смену → сотрудника → отправляет
```

## Особенности

### Инжекция

Модуль `@Global()`, `NotificationService` доступен везде:

```typescript
@Global()
@Module({
  exports: [NotificationService],
})
export class NotificationModule {}
```

### Работа с моделями

Сервис напрямую использует Mongoose-модели для получения контекста:
- `Order` — для данных заказа и клиента
- `Issue` — для тикетов
- `Shift` — для смен
- `Employee` — для сотрудников

### Ошибки

- Если `telegramId` отсутствует — выбрасывается `NotFoundException`
- Ошибки Telegram API пробрасываются наверх

## Best Practices

```typescript
// ✅ Проверяйте наличие telegramId перед вызовом
if (customer.telegramId) {
  await notificationService.notifyCustomer(customer.telegramId, message);
}

// ✅ Используйте use-case методы для стандартных сценариев
await notificationService.notifyCustomerAboutOrderUpdate(orderId);

// ✅ Обрабатывайте ошибки
try {
  await notificationService.notifyCustomer(telegramId, message);
} catch (error) {
  // Логировать, но не блокировать основной процесс
}
```

## Расширение

Для добавления нового канала (push/email/SMS):

1. Создайте новый provider в `providers/`
2. Зарегистрируйте в `NotificationProvidersModule`
3. Добавьте методы в `NotificationService`
4. При необходимости активируйте `notification.schema.ts` для хранения статусов
