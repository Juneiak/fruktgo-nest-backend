# BatchLocation

Остатки партий в конкретных локациях.

## Структура

```
batch-location/
├── batch-location.schema.ts   # Схема
├── batch-location.enums.ts    # Статусы
├── batch-location.commands.ts # Команды
├── batch-location.queries.ts  # Запросы
├── batch-location.port.ts     # Интерфейс
├── batch-location.service.ts  # Реализация
├── batch-location.module.ts   # NestJS модуль
└── index.ts
```

## BatchLocation

**Что это:** Связь партии с конкретной локацией — показывает, сколько товара из партии лежит в данном месте.

```typescript
BatchLocation {
  seller,
  batch → Batch,
  product → InventoryProduct,
  
  // Локация
  locationType,             // SHOP, WAREHOUSE
  shop,                     // Если SHOP
  warehouse,                // Если WAREHOUSE
  zone,                     // Зона внутри локации
  
  // Количество
  quantity,                 // Фактическое количество
  reservedQuantity,         // Зарезервировано под заказы
  
  // Свежесть в этой локации
  freshnessRemaining,       // 0-10
  
  // Статус
  status,                   // AVAILABLE, RESERVED, EXPIRED, WRITTEN_OFF
  
  // История условий
  conditionsHistory: [{
    temperature, humidity,
    recordedAt,
  }],
  
  lastConditionsUpdate,
}
```

### Остаток товара

**Доступно для продажи:**
```typescript
availableQuantity = quantity - reservedQuantity
```

**Общий остаток товара в локации:**
```typescript
totalStock = SUM(BatchLocation.quantity) WHERE product AND location
```

---

## Связь с Batch

```
Batch (партия)
  │
  ├── BatchLocation (магазин А) — 50 шт
  │
  ├── BatchLocation (магазин Б) — 30 шт
  │
  └── BatchLocation (склад) — 20 шт
      
Batch.currentQuantity = 50 + 30 + 20 = 100 шт
```

Одна партия может быть распределена по нескольким локациям после перемещений.

---

## Резервирование

При создании заказа:
```
quantity: 100
reservedQuantity: 0  →  reservedQuantity: 5
                        (зарезервировали 5 шт под заказ)
```

После сборки заказа:
```
quantity: 100 → 95   (товар отдали)
reservedQuantity: 5 → 0
```

---

## FEFO (First Expired, First Out)

При резервировании/продаже берём партии с ближайшим сроком:

```typescript
const batches = await batchLocationPort.getProductStockInLocation(
  new BatchLocationQueries.GetProductStockInLocationQuery({
    seller, product,
    locationType: LocationType.SHOP,
    locationId: shopId,
    sortByExpiration: true,  // FEFO!
    withQuantityOnly: true,
  }),
);

// batches[0] — партия с самым близким сроком
```

---

## Команды

```typescript
// Создать (при приёмке или перемещении)
new BatchLocationCommands.CreateBatchLocationCommand({
  seller, batch, product,
  locationType, locationId,
  quantity,
});

// Зарезервировать
new BatchLocationCommands.ReserveQuantityCommand({
  batchLocationId,
  quantity: 5,
  orderId,
});

// Отменить резерв
new BatchLocationCommands.ReleaseReservationCommand({
  batchLocationId,
  quantity: 5,
  orderId,
});

// Уменьшить количество (продажа, списание)
new BatchLocationCommands.DeductQuantityCommand({
  batchLocationId,
  quantity: 5,
  reason: 'SALE',
});

// Обновить условия
new BatchLocationCommands.UpdateConditionsCommand({
  batchLocationId,
  temperature: 4,
  humidity: 85,
});
```

## Запросы

```typescript
// Остатки товара в локации (FEFO)
new BatchLocationQueries.GetProductStockInLocationQuery({
  seller, product,
  locationType: LocationType.SHOP,
  locationId: shopId,
  sortByExpiration: true,
});

// Все остатки в локации
new BatchLocationQueries.GetAllStockInLocationQuery({
  seller,
  locationType: LocationType.SHOP,
  locationId: shopId,
});

// Проверить доступность
new BatchLocationQueries.CheckAvailabilityQuery({
  seller, product,
  locationType, locationId,
  quantity: 10,
});
```

## Экспорт

```typescript
import {
  BATCH_LOCATION_PORT, BatchLocationPort,
  BatchLocation, BatchLocationStatus,
  BatchLocationCommands, BatchLocationQueries,
} from 'src/modules/new-inventory/batch-location';
```
