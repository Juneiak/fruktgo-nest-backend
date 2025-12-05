# BatchLocation — Остатки в локациях

Показывает, сколько товара из какой партии лежит в конкретном месте.

---

## Простое объяснение

Представь: у тебя есть 100 кг яблок (партия #1234). Ты распределил их:

```
Партия #1234 (100 кг яблок)
    │
    ├── Склад: 30 кг           ← BatchLocation #1
    ├── Магазин А: 50 кг       ← BatchLocation #2
    └── Магазин Б: 20 кг       ← BatchLocation #3
```

**BatchLocation** = связь между партией и локацией с указанием количества.

---

## Зачем это нужно?

### 1. Знаем точно где что лежит

```
Где наши яблоки?
→ Склад: 30 кг (партия #1234)
→ Магазин А: 50 кг (партия #1234) + 20 кг (партия #1567)
```

### 2. Считаем остаток динамически

```
Сколько яблок в магазине А?
= BatchLocation[партия #1234].quantity + BatchLocation[партия #1567].quantity
= 50 + 20
= 70 кг
```

### 3. Резервируем под заказы

```
BatchLocation { quantity: 50, reservedQuantity: 5 }
                ↑ всего      ↑ зарезервировано под заказ

Доступно для продажи = 50 - 5 = 45 кг
```

---

## Структура

```
batch-location/
├── batch-location.schema.ts
├── batch-location.enums.ts
├── batch-location.commands.ts
├── batch-location.queries.ts
├── batch-location.port.ts
├── batch-location.service.ts
├── batch-location.module.ts
└── index.ts
```

---

## BatchLocation

### Поля

```typescript
BatchLocation {
  seller,
  batch,                    // → Batch
  product,                  // → InventoryProduct
  
  // Где лежит
  locationType,             // SHOP или WAREHOUSE
  shop,                     // Если SHOP
  warehouse,                // Если WAREHOUSE
  zone,                     // Зона внутри локации
  
  // Количество
  quantity,                 // Фактическое количество
  reservedQuantity,         // Зарезервировано под заказы
  
  // Состояние
  freshnessRemaining,       // Свежесть в этой локации (0-10)
  status,                   // AVAILABLE, RESERVED, EXPIRED, WRITTEN_OFF
  
  // Условия хранения (история)
  conditionsHistory: [{
    temperature,
    humidity,
    recordedAt,
  }],
  
  lastConditionsUpdate,
}
```

---

## Как считается остаток

### Остаток товара в локации

```
Остаток яблок в магазине А
= SUM(BatchLocation.quantity) WHERE product='яблоки' AND shop='А'
= 50 + 20 + 15
= 85 кг

Нет отдельного поля "остаток"!
Всегда считаем из BatchLocation.
```

### Доступно для продажи

```
availableQuantity = quantity - reservedQuantity

BatchLocation { quantity: 50, reservedQuantity: 5 }
→ Доступно: 45 кг
```

### Общий остаток партии

```
Batch.currentQuantity = SUM(BatchLocation.quantity) для этой партии
```

---

## Резервирование

### Как работает

```
1. Клиент создал заказ на 5 кг
   BatchLocation { quantity: 50, reservedQuantity: 0 }
                                                ↓
   BatchLocation { quantity: 50, reservedQuantity: 5 }
   
   Товар зарезервирован, но физически на полке!

2. Сборщик собрал заказ
   BatchLocation { quantity: 50, reservedQuantity: 5 }
                          ↓                    ↓
   BatchLocation { quantity: 45, reservedQuantity: 0 }
   
   Товар физически отдали.
```

### Зачем мягкое резервирование?

```
Клиент создал заказ в 10:00
Сборщик начнёт собирать в 14:00

4 часа товар лежит на полке, но "занят"
→ Другой клиент не может его заказать
→ Но если клиент отменит заказ — товар снова доступен
```

---

## FEFO — сначала то, что скоро испортится

При резервировании система автоматически выбирает партии с ближайшим сроком:

```
У нас 3 BatchLocation для яблок в магазине:

#1: 20 кг, срок до 05.12 (2 дня)   ← берём первой
#2: 30 кг, срок до 10.12 (7 дней)
#3: 15 кг, срок до 15.12 (12 дней)

Клиент заказал 25 кг:
→ Берём 20 кг из #1 (там всё)
→ Берём 5 кг из #2
```

### Как использовать FEFO

```typescript
const stock = await batchLocationPort.getProductStockInLocation(
  new BatchLocationQueries.GetProductStockInLocationQuery({
    seller: sellerId,
    product: productId,
    locationType: LocationType.SHOP,
    locationId: shopId,
    sortByExpiration: true,  // ← FEFO!
    withQuantityOnly: true,  // Только с остатком > 0
  }),
);

// stock[0] — партия с ближайшим сроком
// stock[1] — следующая по сроку
// ...
```

---

## Операции с BatchLocation

### Создать (при приёмке или перемещении)

```typescript
await batchLocationPort.create(
  new BatchLocationCommands.CreateBatchLocationCommand({
    seller: sellerId,
    batch: batchId,
    product: productId,
    locationType: LocationType.SHOP,
    locationId: shopId,
    quantity: 100,
  }),
);
```

### Зарезервировать

```typescript
await batchLocationPort.reserve(
  new BatchLocationCommands.ReserveQuantityCommand({
    batchLocationId,
    quantity: 5,
    orderId,
  }),
);

// quantity: 100 → 100 (не меняется)
// reservedQuantity: 0 → 5
```

### Отменить резерв

```typescript
await batchLocationPort.releaseReservation(
  new BatchLocationCommands.ReleaseReservationCommand({
    batchLocationId,
    quantity: 5,
    orderId,
    reason: 'Заказ отменён',
  }),
);

// reservedQuantity: 5 → 0
```

### Списать (продажа, списание)

```typescript
await batchLocationPort.deduct(
  new BatchLocationCommands.DeductQuantityCommand({
    batchLocationId,
    quantity: 5,
    reason: 'SALE',
    orderId,
  }),
);

// quantity: 100 → 95
// reservedQuantity: 5 → 0
```

### Обновить условия

```typescript
await batchLocationPort.updateConditions(
  new BatchLocationCommands.UpdateConditionsCommand({
    batchLocationId,
    temperature: 4,
    humidity: 85,
    source: 'SENSOR',
  }),
);
```

---

## Запросы

### Остатки товара в локации

```typescript
const stock = await batchLocationPort.getProductStockInLocation(
  new BatchLocationQueries.GetProductStockInLocationQuery({
    seller, product,
    locationType: LocationType.SHOP,
    locationId: shopId,
    sortByExpiration: true,
  }),
);
```

### Все остатки в локации

```typescript
const allStock = await batchLocationPort.getAllStockInLocation(
  new BatchLocationQueries.GetAllStockInLocationQuery({
    seller,
    locationType: LocationType.SHOP,
    locationId: shopId,
  }),
);
```

### Проверить доступность

```typescript
const isAvailable = await batchLocationPort.checkAvailability(
  new BatchLocationQueries.CheckAvailabilityQuery({
    seller, product,
    locationType: LocationType.SHOP,
    locationId: shopId,
    quantity: 10,  // Нужно 10 кг, есть ли?
  }),
);

// isAvailable: true/false
```

### Товары с низким остатком

```typescript
const lowStock = await batchLocationPort.getLowStock(
  new BatchLocationQueries.GetLowStockQuery({
    locationType: LocationType.SHOP,
    locationId: shopId,
    threshold: 5,  // Меньше 5 единиц
  }),
);
```

---

## Экспорт

```typescript
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  
  BatchLocation,
  BatchLocationStatus,
  
  BatchLocationCommands,
  BatchLocationQueries,
} from 'src/modules/new-inventory/batch-location';
```
