# Batch

Партии товара — основа партионного учёта.

## Структура

```
batch/
├── batch.schema.ts          # Схема Batch
├── batch.enums.ts           # BatchStatus, BatchOrigin
├── batch.commands.ts        # Команды
├── batch.queries.ts         # Запросы
├── batch.port.ts            # Интерфейс
├── batch.service.ts         # Реализация
├── batch.module.ts          # NestJS модуль
├── mixed-batch.schema.ts    # Смешанные партии
└── index.ts
```

## Batch

**Что это:** Партия товара с одной приёмки — имеет единую дату истечения и закупочную цену.

```typescript
Batch {
  seller,
  product → InventoryProduct,
  
  batchNumber,              // "B-2024-001234"
  
  // Даты
  productionDate,           // Дата производства
  expirationDate,           // Исходная дата истечения
  effectiveExpirationDate,  // Динамическая (с учётом условий)
  receivedAt,               // Когда принят
  
  // Количество
  initialQuantity,          // Сколько было изначально
  currentQuantity,          // Сколько осталось (сумма BatchLocation)
  
  // Свежесть (0-10)
  initialFreshness,         // При приёмке
  freshnessRemaining,       // Сейчас
  
  // Цена
  purchasePrice,            // Закупочная цена за единицу
  
  // Происхождение
  origin,                   // PURCHASE, PRODUCTION, TRANSFER, RETURN
  supplier,                 // Поставщик
  receiving,                // Связь с приёмкой
  
  status,                   // ACTIVE, EXPIRED, WRITTEN_OFF, DEPLETED, DISPUTE
  
  qrCode,                   // QR-код для сканирования
}
```

### Статусы партии

| Статус | Описание |
|--------|----------|
| `ACTIVE` | Активна, можно продавать |
| `EXPIRED` | Истёк срок, нужно списать |
| `WRITTEN_OFF` | Списана |
| `DEPLETED` | Полностью израсходована |
| `DISPUTE` | Спор с поставщиком (заблокирована) |

### Происхождение партии

| Origin | Описание |
|--------|----------|
| `PURCHASE` | Закупка у поставщика |
| `PRODUCTION` | Собственное производство |
| `TRANSFER` | Перемещение (частичное) |
| `RETURN` | Возврат от клиента |

---

## MixedBatch

**Что это:** Смешанная партия — создаётся автоматически при консолидации мелких остатков.

```typescript
MixedBatch {
  seller,
  product,
  location,
  
  components: [{            // Из каких партий состоит
    batch,
    quantity,
    freshnessAtMixing,
    originalExpirationDate,
  }],
  
  totalQuantity,
  effectiveExpirationDate,  // MIN из всех компонентов
  effectiveFreshness,       // Средневзвешенная
  
  reason,                   // AUTO_CONSOLIDATION, AUDIT_CONSOLIDATION, FOUND_MIXED
  
  isActive,
}
```

**Зачем нужен:**
- Трассировка: всегда знаем, из каких партий состоит смешанный товар
- Срок = минимальный из всех компонентов (безопасность)
- Создаётся автоматически при инвентаризации или cron-консолидации

---

## Жизненный цикл партии

```
Приёмка (Receiving)
       │
       ▼
   Batch (ACTIVE)
       │
       ├── Продажа → quantity уменьшается
       │
       ├── Перемещение → создаётся BatchLocation в новой локации
       │
       ├── Списание → status = WRITTEN_OFF
       │
       ├── Истёк срок → status = EXPIRED
       │
       └── Quantity = 0 → status = DEPLETED
```

## Команды

```typescript
// Создать партию (обычно через Receiving)
new BatchCommands.CreateBatchCommand({
  seller, product,
  expirationDate, purchasePrice,
  initialQuantity, supplier,
});

// Обновить количество
new BatchCommands.UpdateQuantityCommand(batchId, newQuantity);

// Обновить свежесть (ручная корректировка)
new BatchCommands.UpdateFreshnessCommand(batchId, newFreshness, reason);

// Пометить как истёкший
new BatchCommands.MarkAsExpiredCommand(batchId);
```

## Запросы

```typescript
// Получить партию
new BatchQueries.GetBatchByIdQuery(batchId);

// Партии товара в локации (FEFO)
new BatchQueries.GetBatchesByProductQuery({
  seller, product, location,
  sortByExpiration: true,  // FEFO
});

// Истекающие партии
new BatchQueries.GetExpiringBatchesQuery({
  seller,
  daysUntilExpiration: 3,
});
```

## Экспорт

```typescript
import {
  BATCH_PORT, BatchPort,
  Batch, BatchStatus, BatchOrigin,
  MixedBatch, MixedBatchReason,
  BatchCommands, BatchQueries,
} from 'src/modules/new-inventory/batch';
```
