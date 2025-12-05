# Reservation — Резервирование

Резервируем товар под заказы. Товар "занят", но физически на полке.

---

## Зачем нужно резервирование?

### Проблема без резервирования

```
10:00 — Клиент А заказал 5 кг яблок (остаток 10 кг)
10:05 — Клиент Б заказал 7 кг яблок (остаток 10 кг)

Оба заказа приняты!
Но у нас только 10 кг, а нужно 12.

Кто-то останется без яблок :(
```

### С резервированием

```
10:00 — Клиент А заказал 5 кг яблок
        → Резервируем 5 кг
        → Остаток: 10 кг, доступно: 5 кг

10:05 — Клиент Б хочет 7 кг яблок
        → Доступно только 5 кг
        → "Извините, можем доставить только 5 кг"
```

---

## Структура

```
reservation/
├── reservation.schema.ts
├── reservation.enums.ts
├── reservation.commands.ts
├── reservation.queries.ts
├── reservation.port.ts
├── reservation.service.ts
├── reservation.module.ts
└── index.ts
```

---

## Как работает резервирование

### Шаг 1: Создаём резерв

```
Клиент создал заказ на 5 кг яблок

До:
BatchLocation { quantity: 50, reservedQuantity: 0 }

После:
BatchLocation { quantity: 50, reservedQuantity: 5 }

Товар зарезервирован, но физически на полке!
```

### Шаг 2: Сборка заказа

```
Сборщик взял товар с полки

До:
BatchLocation { quantity: 50, reservedQuantity: 5 }

После:
BatchLocation { quantity: 45, reservedQuantity: 0 }

Товар физически отдали.
```

### Шаг 3: Отмена (если нужно)

```
Клиент отменил заказ

До:
BatchLocation { quantity: 50, reservedQuantity: 5 }

После:
BatchLocation { quantity: 50, reservedQuantity: 0 }

Резерв снят, товар снова доступен.
```

---

## Reservation

### Поля

```typescript
Reservation {
  seller,
  order,                    // → Order
  shop,                     // → Shop
  
  items: [{
    product,
    quantity,
    
    allocations: [{         // Из каких партий
      batch,
      batchLocation,
      quantity,
    }],
  }],
  
  status,                   // PENDING, CONFIRMED, FULFILLED...
  
  reservedAt,
  expiresAt,                // Автоотмена если не подтверждён
  fulfilledAt,
}
```

### Статусы

```
PENDING             — Создан, ожидает подтверждения
CONFIRMED           — Подтверждён
PARTIALLY_FULFILLED — Частично выполнен
FULFILLED           — Полностью выполнен
CANCELLED           — Отменён
EXPIRED             — Истёк (заказ не подтверждён вовремя)
```

---

## FEFO при резервировании

Система автоматически выбирает партии с ближайшим сроком:

```
У нас 3 партии яблок:
├── #1: 20 кг, срок до 05.12 (2 дня)
├── #2: 30 кг, срок до 10.12 (7 дней)
└── #3: 15 кг, срок до 15.12 (12 дней)

Клиент заказал 25 кг:

Reservation.allocations:
├── Партия #1: 20 кг (вся, срок ближе всего)
└── Партия #2: 5 кг (добираем)
```

---

## Приоритет офлайн-покупателя

**Ситуация:** Клиент онлайн зарезервировал товар, но ещё не собрали. А на кассу пришёл живой покупатель.

**Правило:** Если заказ **ещё не собран** — живой покупатель имеет приоритет.

```typescript
// 1. Проверяем, можно ли перехватить
const canOverride = await reservationPort.canOverrideReservation(reservationId);

// 2. Если да — перехватываем
if (canOverride) {
  await reservationPort.overrideForOffline(
    new ReservationCommands.OverrideForOfflineCommand({
      reservationId,
      quantity: 2,
      reason: 'Офлайн-покупатель',
    }),
  );
}

// 3. Онлайн-клиенту отправляется уведомление:
//    "К сожалению, часть товара была продана. Мы скорректировали ваш заказ."
```

---

## Примеры использования

### Создать резерв

```typescript
const reservation = await reservationPort.create(
  new ReservationCommands.CreateReservationCommand({
    orderId,
    shopId,
    items: [
      { productId: 'apples', quantity: 5 },
      { productId: 'bananas', quantity: 3 },
    ],
  }),
);

// Система автоматически:
// 1. Находит партии по FEFO
// 2. Увеличивает reservedQuantity в BatchLocation
// 3. Создаёт Reservation с allocations
```

### Подтвердить резерв

```typescript
await reservationPort.confirm(
  new ReservationCommands.ConfirmReservationCommand(reservationId),
);
```

### Выполнить резерв (при сборке)

```typescript
await reservationPort.fulfill(
  new ReservationCommands.FulfillReservationCommand({
    reservationId,
    fulfilledItems: [
      { productId: 'apples', actualQuantity: 4.8 },  // Допуск веса
      { productId: 'bananas', actualQuantity: 3 },
    ],
    employeeId,
  }),
);

// Система:
// 1. Уменьшает quantity в BatchLocation
// 2. Сбрасывает reservedQuantity
// 3. Создаёт Movement (SALE)
// 4. Обновляет статус Reservation → FULFILLED
```

### Отменить резерв

```typescript
await reservationPort.cancel(
  new ReservationCommands.CancelReservationCommand({
    reservationId,
    reason: 'Клиент отменил заказ',
  }),
);

// reservedQuantity возвращается обратно
```

### Проверить доступность

```typescript
const availability = await reservationPort.checkAvailability(
  new ReservationQueries.CheckAvailabilityQuery({
    shopId,
    items: [
      { productId: 'apples', quantity: 10 },
    ],
  }),
);

// availability:
// {
//   available: true,
//   items: [
//     {
//       productId: 'apples',
//       requested: 10,
//       available: 15,
//       canFulfill: true,
//     },
//   ],
// }
```

---

## Автоматическое истечение

Если заказ не подтверждён в течение N минут — резерв автоматически снимается.

```typescript
Reservation {
  reservedAt: '10:00',
  expiresAt: '10:30',  // 30 минут на подтверждение
}

// Cron каждые 5 минут проверяет истёкшие резервы
// и снимает их
```

---

## Экспорт

```typescript
import {
  RESERVATION_PORT,
  ReservationPort,
  
  Reservation,
  ReservationStatus,
  
  ReservationCommands,
  ReservationQueries,
} from 'src/modules/new-inventory/reservation';
```
