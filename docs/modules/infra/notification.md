# Notification Infrastructure Module

`src/infra/notification` содержит `NotificationService` и набор Telegram‑провайдеров, через которые отправляются сообщения клиентам, продавцам, сотрудникам и администраторам. На текущий момент модуль **не** хранит уведомления в базе и **не** реализует push/email/SMS — единственный канал доставки — соответствующие Telegram‑боты.

## 1. Обзор

- отправляет текстовые уведомления в Telegram от имени разных ботов (`customer`, `seller`, `employee`, `admin`);
- содержит use‑case методы для популярных сценариев (обновление заказа, смены, issue, запросы к сотрудникам);
- зависит от доменных моделей (Order, Issue, Shift, Employee) для получения контекста перед отправкой сообщений;
- экспортирует `NotificationService` как `@Global()` Nest‑модуль, прямого `NotificationPort` нет.

## 2. Схема данных

Персистентное хранилище уведомлений пока не используется. В каталоге есть `notification.schema.ts` с enum'ами и структурой документов, но код модуля не сохраняет данные в MongoDB. Будущая интеграция потребует обновления документации.

## 3. Енумы

- `NotificationType`, `NotificationPriority`, `NotificationStatus` объявлены в `notification.schema.ts`, но не применяются в текущем сервисе.
- Фактическая логика опирается на доменные события (например, «заказ обновлён») и готовые методы провайдеров, поэтому enum'ы рассматриваются как задел на будущее.

## 4. Commands / Queries / Port

Отсутствуют. `NotificationService` инжектируется напрямую и предоставляет методы:

- `notifyAdmin(message)`
- `notifyCustomer(telegramId, message, options?)`
- `notifyCustomerAboutOrderUpdate(orderId)`
- `notifyCustomerAboutIssueUpdate(issueId)`
- `notifySeller(telegramId, message, options?)`
- `notifySellerAboutShiftUpdate(shiftId, haveOpened)`
- `notifySellerAboutIssueUpdate(issueId)`
- `notifyEmployee(...)` (несколько методов для заказов/запросов/логина)

## 5. Service

`NotificationService`:

1. Инжектирует `TelegramCustomerNotificationProvider`, `TelegramSellerNotificationProvider`, `TelegramEmployeeNotificationProvider`, `TelegramAdminNotificationProvider`.
2. Для сценариев с ID (order/issue/shift/request) выгружает документ через Mongoose (`Order`, `Issue`, `Shift`, `Employee`, `RequestToEmployee`, `EmployeeLoginCode`) и извлекает `telegramId` адресата.
3. Делегирует отправку соответствующему провайдеру, который обращается к своему Telegram‑боту (`Telegram...BotService`).
4. Возвращает `TelegramNotificationResponseDto` (ответ Telegram API).
5. Не ведёт учёт статусов, не ретраит доставку и не кэширует сообщения.

## 6. Providers

Каждый провайдер инкапсулирует конкретного бота:

- `TelegramCustomerNotificationProvider` — уведомления клиентов о заказах/тикетах.
- `TelegramSellerNotificationProvider` — уведомления продавцов о сменах и issue.
- `TelegramEmployeeNotificationProvider` — новые заказы, приглашения, логин‑коды.
- `TelegramAdminNotificationProvider` — общие сообщения администраторам.

Провайдеры подключаются через `NotificationProvidersModule`, где бот‑модули импортируются через `forwardRef`.

## 7. Связи и использование

```typescript
@Injectable()
export class OrderStatusNotifier {
  constructor(private readonly notificationService: NotificationService) {}

  async notifyCustomer(orderId: string) {
    await this.notificationService.notifyCustomerAboutOrderUpdate(orderId);
  }

  async notifySellerAboutShift(shiftId: string, haveOpened: boolean) {
    await this.notificationService.notifySellerAboutShiftUpdate(shiftId, haveOpened);
  }
}
```

- Доменные сервисы должны гарантировать наличие `telegramId` у получателя перед вызовом.
- Для кастомных текстов используйте базовые методы `notifyCustomer/notifySeller/notifyEmployee`, передавая произвольное сообщение и `reply_markup`, если нужно.
- Если требуется поддержка других каналов (push/email/SMS/хранилище), необходимо расширить модуль — текущая документация отражает только Telegram‑часть.

## 8. Best Practices

1. **Проверяйте наличие Telegram ID.** Отправка падает с `NotFoundException`, если у сущности нет `telegramId`. Обрабатывайте это на уровне вызывающего сервиса.
2. **Разделяйте ответственности.** `NotificationService` только отправляет сообщения. Бизнес‑решение «кому и когда отправить» принимают доменные сервисы.
3. **Повторная отправка.** Если Telegram отвечает ошибкой, сервис её пробрасывает — при необходимости повторов реализуйте их во внешнем слое.
4. **Расширение каналов.** Для добавления push/email/SMS придётся:
   - определить новый провайдер;
   - внедрить его в `NotificationService` и соответствующие методы;
   - при необходимости задействовать схему `Notification` для хранения статусов.
