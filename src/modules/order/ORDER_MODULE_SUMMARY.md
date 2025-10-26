# Order Module - Краткое руководство

## 📋 Обзор

Модуль для управления заказами с использованием **Event Sourcing** архитектуры. Вся история заказа сохраняется в виде событий, что позволяет отслеживать полный lifecycle заказа.

## 🏗️ Архитектура

### Основные компоненты:

```
order/
├── order.schema.ts       - Mongoose схема с событиями
├── order.service.ts      - Доменный сервис (чистая бизнес-логика)
├── order.facade.ts       - Фасад для внешних модулей
├── order.port.ts         - Интерфейс для взаимодействия
├── order.module.ts       - NestJS модуль
├── order.commands.ts     - Команды изменения состояния
├── order.queries.ts      - Запросы для чтения данных
├── order.enums.ts        - Перечисления и константы
├── order.helpers.ts      - Валидация переходов статусов
├── order.events.helpers.ts - Утилиты для работы с событиями
├── order.types.ts        - TypeScript типы
└── order.constants.ts    - Константы модуля
```

---

## 🔄 Жизненный цикл заказа

### Нормальный flow:
```
PENDING → ASSEMBLING → AWAITING_COURIER → IN_DELIVERY → DELIVERED
```

### Терминальные статусы:
- `DELIVERED` - успешно доставлен
- `CANCELLED` - отменен клиентом/системой
- `DECLINED` - отклонен магазином
- `RETURNED` - возвращен после доставки

---

## 📦 Основные файлы

### 1. **order.schema.ts** - Схема данных

```typescript
// Основные сущности:
Order {
  orderStatus: OrderStatus          // Текущий статус
  events: OrderEvent[]              // История событий (Event Sourcing)
  products: OrderProduct[]          // Товары
  finances: OrderFinances           // Финансы
  delivery: OrderDelivery           // Доставка
  rating: OrderRating               // Рейтинг
  orderedBy: OrderedBy             // Кто заказал
  orderedFrom: OrderedFrom         // Откуда заказ
  handledBy: HandledBy             // Кто обработал
}

OrderEvent {
  type: OrderEventType              // Тип события
  timestamp: Date                   // Когда произошло
  actor: OrderEventActor           // Кто совершил
  data: Record<string, any>        // Дополнительные данные
  metadata: Record<string, any>    // Метаданные
}
```

---

### 2. **order.service.ts** - Доменный сервис

Чистый сервис без зависимостей от других модулей. Только работа с OrderModel.

#### **Queries (чтение)**:
- `getOrder()` - получить один заказ
- `getOrders()` - список с фильтрами и пагинацией
- `getActiveOrders()` - активные заказы (используется `OrderStatusActive`)
- `getOrdersByCustomer()` - заказы клиента
- `getOrdersByShop()` - заказы магазина
- `getOrderEvents()` - события заказа

#### **Commands (изменение)**:
- `createOrder()` - создать заказ *(данные заполняются оркестратором)*
- `acceptOrder()` - принять в работу
- `completeAssembly()` - завершить сборку
- `handToCourier()` - передать курьеру
- `deliverOrder()` - доставлен
- `cancelOrder()` - отменить
- `declineOrder()` - отклонить
- `setOrderRating()` - установить рейтинг

**Особенности:**
- Все команды поддерживают `session` для транзакций
- Валидация переходов статусов через `canTransitionTo()`
- Все действия сохраняются как события
- Не содержит бизнес-логику других модулей

---

### 3. **order.commands.ts** - Команды

Используют **готовые типы** из `order.schema.ts` и `order.types.ts`:

```typescript
// ✅ Правильно - используем OrderEventActor
canceledBy: OrderEventActor

// ❌ Неправильно - inline типы
canceledBy: { type: 'customer' | 'employee' | 'system' }

// ✅ Правильно - используем OrderMetadata
metadata?: OrderMetadata

// ❌ Неправильно - inline объект
metadata?: { source?: 'app' | 'web' }
```

**Все команды имеют поддержку session:**
```typescript
command.session?: ClientSession
```

---

### 4. **order.enums.ts** - Перечисления

#### Готовые константы:
```typescript
OrderStatus           // Все статусы заказа
OrderEventType        // Типы событий
OrderStatusActive     // [PENDING, ASSEMBLING, AWAITING_COURIER, IN_DELIVERY]
OrderStatusTerminal   // [DELIVERED, CANCELLED, DECLINED, RETURNED]
OrderStatusFlow       // Нормальная последовательность статусов
OrderCancelReason     // Причины отмены
OrderDeclineReason    // Причины отклонения
```

**Использование:**
```typescript
// ✅ Правильно
if (OrderStatusTerminal.includes(order.orderStatus as any)) {...}

// ❌ Неправильно
if (isTerminalStatus(order.orderStatus)) {...}
```

---

### 5. **order.helpers.ts** - Утилиты валидации

```typescript
// Проверка возможности перехода
canTransitionTo(from: OrderStatus, to: OrderStatus): boolean

// Пример
if (!canTransitionTo(order.orderStatus, OrderStatus.DELIVERED)) {
  throw DomainError.invariant('Invalid transition');
}
```

---

### 6. **order.events.helpers.ts** - Работа с событиями

#### Создание событий:
```typescript
createOrderEvent(type, actor, data, metadata)
createCancelEvent(reason, comment, actor)
createDeclineEvent(reason, comment, actor)
createRatingEvent(rating, tags, comment, actor)
```

#### Чтение событий:
```typescript
getLastEvent(events, type)           // Последнее событие типа
getEventsByType(events, type)        // Все события типа
hasEvent(events, type)               // Проверка наличия
getEventsTimeline(events)            // Упорядоченная история
getTotalProcessingTime(events)       // Время обработки
```

---

### 7. **order.types.ts** - TypeScript типы

```typescript
OrderEventActor      // { type, id, name }
OrderMetadata        // { version, source, deviceInfo, ipAddress }
EventsFilter         // Фильтр для событий
OrderStatistics      // Статистика заказов
```

---

### 8. **order.facade.ts** - Фасад

Упрощает взаимодействие с модулем. Реализует интерфейс `OrderPort`.

```typescript
@Inject(ORDER_PORT) private orderPort: OrderPort

// Использование
await this.orderPort.createOrder(command);
await this.orderPort.getOrders(query, options);
```

---

### 9. **order.port.ts** - Интерфейс

Определяет контракт для внешних модулей. Все методы facade и service реализуют этот интерфейс.

---

## 🔧 Как использовать

### В других модулях:

```typescript
@Module({
  imports: [OrderModule],
})
export class SomeModule {}

// В сервисе
constructor(
  @Inject(ORDER_PORT) private readonly orderPort: OrderPort
) {}

// Создание заказа
const order = await this.orderPort.createOrder(
  new CreateOrderCommand(
    customerId,
    shopId,
    shiftId,
    products,
    delivery,
    finances,
    comment,
    metadata,
    session  // Опционально для транзакций
  )
);

// Получение заказов
const orders = await this.orderPort.getOrders(
  new GetOrdersQuery({ shopId: '123' }),
  { pagination: { page: 1, pageSize: 10 } }
);
```

---

## 🎯 Принципы работы

### 1. **Event Sourcing**
Каждое действие создает событие в массиве `events[]`. История никогда не удаляется.

### 2. **Доменная чистота**
`OrderService` не зависит от других модулей. Все внешние данные должны быть переданы через оркестраторы.

### 3. **Транзакции**
Все команды поддерживают `session` для атомарных операций.

### 4. **Валидация переходов**
Нельзя перейти из любого статуса в любой. Проверка через `canTransitionTo()`.

### 5. **Использование готовых типов**
Всегда используем типы из `order.enums.ts`, `order.schema.ts` и `order.types.ts`.

---

## 📝 Пример: Полный цикл заказа

```typescript
// 1. Создание заказа (оркестратор)
const order = await orderService.createOrder(command);

// 2. Принятие в работу (сотрудник)
await orderService.acceptOrder(
  new AcceptOrderCommand(orderId, employeeId, employeeName, session)
);

// 3. Завершение сборки
await orderService.completeAssembly(
  new CompleteAssemblyCommand(orderId, employeeId, employeeName, actualProducts, session)
);

// 4. Передача курьеру
await orderService.handToCourier(
  new HandToCourierCommand(orderId, employeeId, employeeName, courierInfo, session)
);

// 5. Доставка
await orderService.deliverOrder(
  new DeliverOrderCommand(orderId, session)
);

// 6. Рейтинг (клиент)
await orderService.setOrderRating(
  new SetOrderRatingCommand(orderId, customerId, customerName, 5, ['GOOD_QUALITY'], 'Отлично!', session)
);
```

---

## ⚠️ Важные замечания

1. **Данные заполняются оркестратором**: `createOrder()` создает заказ с пустыми полями `customerName`, `shopName`, `productName`. Оркестратор должен заполнить их.

2. **Сессии опциональны**: Все команды поддерживают `session?`, но не требуют её обязательно.

3. **Терминальные статусы**: Нельзя изменить заказ в терминальном статусе (кроме установки рейтинга для DELIVERED).

4. **События - источник истины**: Статус можно вос становить из событий через `EventToStatusMap`.

---

## 🚀 Следующие шаги

1. Создать **оркестраторы** для сложной бизнес-логики
2. Интегрировать с модулями **Shop**, **Customer**, **Product** через порты
3. Добавить **WebSocket уведомления** для обновления статусов
4. Реализовать **аналитику** на основе событий
5. Добавить **автоматические переходы** (таймауты, SLA)

---

## 📚 Дополнительно

- Все методы содержат JSDoc комментарии
- Типы строго типизированы
- Используется паттерн CQRS (Command/Query Separation)
- Поддержка транзакций MongoDB
- Event Sourcing для полной истории изменений
