# Reservation

Резервирование товара под заказы.

## Структура

```
reservation/
├── reservation.schema.ts    # Схема
├── reservation.enums.ts     # Статусы
├── reservation.commands.ts  # Команды
├── reservation.queries.ts   # Запросы
├── reservation.port.ts      # Интерфейс
├── reservation.service.ts   # Реализация
├── reservation.module.ts    # NestJS модуль
└── index.ts
```

## Reservation

**Что это:** Резерв товара под конкретный заказ с привязкой к партиям (FEFO).

```typescript
Reservation {
  seller,
  order,
  shop,
  
  items: [{
    product,
    quantity,
    
    allocations: [{         // Из каких партий
      batch,
      batchLocation,
      quantity,
    }],
  }],
  
  status,                   // PENDING, CONFIRMED, PARTIALLY_FULFILLED, FULFILLED, CANCELLED
  
  reservedAt,
  expiresAt,                // Автоотмена если заказ не подтверждён
  fulfilledAt,
}
```

## Мягкое резервирование

**Как работает:**
1. Заказ создаётся → резервируем товар
2. `BatchLocation.reservedQuantity` увеличивается
3. Физически товар остаётся на месте
4. При сборке — фактически отдаём товар
5. `BatchLocation.quantity` уменьшается, `reservedQuantity` сбрасывается

```
До резерва:
  BatchLocation { quantity: 100, reservedQuantity: 0 }
  
После резерва (заказ на 10 шт):
  BatchLocation { quantity: 100, reservedQuantity: 10 }
  
После сборки:
  BatchLocation { quantity: 90, reservedQuantity: 0 }
```

## FEFO при резервировании

При резервировании автоматически выбираются партии с ближайшим сроком:

```typescript
const reservation = await reservationPort.reserve(
  new ReservationCommands.CreateReservationCommand({
    orderId,
    shopId,
    items: [
      { productId: 'apples', quantity: 5 },
    ],
  }),
);

// Система автоматически выберет:
// - Партия с expirationDate 2024-12-05: 3 шт
// - Партия с expirationDate 2024-12-07: 2 шт
// (сначала те, что истекают раньше)
```

## Приоритет офлайн-покупателя

Если заказ **ещё не собран**, а товар нужен офлайн-покупателю:

```typescript
// 1. Проверяем, можно ли "перехватить" резерв
const canOverride = await reservationPort.canOverrideReservation(reservationId);

// 2. Если да — перехватываем
await reservationPort.overrideForOffline(
  new ReservationCommands.OverrideForOfflineCommand({
    reservationId,
    quantity: 2,
    reason: 'Офлайн-покупатель',
  }),
);

// 3. Онлайн-клиенту отправляется уведомление
```

## Статусы резерва

| Status | Описание |
|--------|----------|
| `PENDING` | Создан, ожидает подтверждения |
| `CONFIRMED` | Подтверждён |
| `PARTIALLY_FULFILLED` | Частично выполнен (часть собрана) |
| `FULFILLED` | Полностью выполнен |
| `CANCELLED` | Отменён |
| `EXPIRED` | Истёк (заказ не подтверждён) |

## Команды

```typescript
// Создать резерв
new ReservationCommands.CreateReservationCommand({
  orderId, shopId,
  items: [{ productId, quantity }],
});

// Подтвердить
new ReservationCommands.ConfirmReservationCommand(reservationId);

// Выполнить (при сборке)
new ReservationCommands.FulfillReservationCommand({
  reservationId,
  fulfilledItems: [{ productId, quantity }],
});

// Отменить
new ReservationCommands.CancelReservationCommand(reservationId, reason);

// Перехват для офлайн
new ReservationCommands.OverrideForOfflineCommand({
  reservationId, quantity, reason,
});
```

## Запросы

```typescript
// Резерв по заказу
new ReservationQueries.GetByOrderQuery(orderId);

// Все активные резервы в магазине
new ReservationQueries.GetActiveReservationsQuery(shopId);

// Проверить доступность для заказа
new ReservationQueries.CheckAvailabilityQuery({
  shopId,
  items: [{ productId, quantity }],
});
```

## Экспорт

```typescript
import {
  RESERVATION_PORT, ReservationPort,
  Reservation, ReservationStatus,
  ReservationCommands, ReservationQueries,
} from 'src/modules/new-inventory/reservation';
```
