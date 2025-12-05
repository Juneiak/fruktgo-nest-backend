# Batch — Партии товара

Партия = товар с одной приёмки (одна дата, один поставщик, одна цена).

---

## Что такое партия?

Представь: ты закупил яблоки у поставщика.

```
Приёмка 1 декабря:
├── 100 кг яблок
├── Срок до: 20 декабря
├── Цена закупки: 80₽/кг
└── Поставщик: ООО "Сады Кубани"

Это одна ПАРТИЯ.
```

Через неделю закупил ещё:

```
Приёмка 8 декабря:
├── 50 кг яблок
├── Срок до: 28 декабря  ← другой срок
├── Цена закупки: 85₽/кг  ← другая цена
└── Поставщик: ИП Иванов  ← другой поставщик

Это ДРУГАЯ ПАРТИЯ.
```

---

## Зачем нужны партии?

### 1. FEFO — продаём сначала то, что скоро испортится

```
У нас 3 партии яблок:
├── Партия #1: срок до 05.12 (2 дня осталось) ← продаём первой!
├── Партия #2: срок до 10.12 (7 дней)
└── Партия #3: срок до 15.12 (12 дней)
```

### 2. Трассировка — знаем откуда что пришло

```
Клиент пожаловался на качество
→ Смотрим из какой партии был товар
→ Партия #1234 от ООО "Сады"
→ Связываемся с поставщиком
```

### 3. Правильный расчёт себестоимости

```
Партия #1: закупка 80₽/кг
Партия #2: закупка 85₽/кг

Средняя себестоимость = (80×100 + 85×50) / 150 = 81.67₽/кг
```

---

## Структура

```
batch/
├── batch.schema.ts          # Обычная партия
├── batch.enums.ts           # Статусы
├── batch.commands.ts
├── batch.queries.ts
├── batch.port.ts
├── batch.service.ts
├── batch.module.ts
├── mixed-batch.schema.ts    # Смешанная партия
└── index.ts
```

---

## Batch — Партия

### Поля

```typescript
Batch {
  seller,
  product,                  // → InventoryProduct
  
  // Идентификация
  batchNumber,              // "B-2024-001234"
  qrCode,                   // QR-код для сканирования
  
  // Даты
  productionDate,           // Когда произведено
  expirationDate,           // Изначальный срок
  effectiveExpirationDate,  // Динамический срок (с учётом условий)
  receivedAt,               // Когда приняли
  
  // Количество
  initialQuantity,          // Сколько было изначально
  currentQuantity,          // Сколько осталось сейчас
  
  // Свежесть (0-10)
  initialFreshness,         // При приёмке (10 = идеально)
  freshnessRemaining,       // Сейчас
  
  // Деньги
  purchasePrice,            // Цена закупки за единицу
  
  // Откуда
  origin,                   // PURCHASE, PRODUCTION, RETURN
  supplier,                 // Поставщик
  receiving,                // → Receiving (документ приёмки)
  
  // Статус
  status,                   // ACTIVE, EXPIRED, WRITTEN_OFF...
}
```

### Статусы партии

```
ACTIVE      — Активна, можно продавать
EXPIRED     — Срок истёк, нужно списать
WRITTEN_OFF — Списана полностью
DEPLETED    — Полностью продана/израсходована
DISPUTE     — Спор с поставщиком (заблокирована)
```

### Происхождение партии

```
PURCHASE    — Купили у поставщика
PRODUCTION  — Сами произвели (своя кухня)
TRANSFER    — Частичное перемещение (отделили от большой партии)
RETURN      — Возврат от клиента
```

---

## MixedBatch — Смешанная партия

**Что это:** Партия, которая состоит из нескольких других партий.

### Когда создаётся?

1. **При инвентаризации** — нашли кучу товара, но непонятно из какой партии
2. **Автоконсолидация** — система объединяет мелкие остатки
3. **После списания** — остались крохи от разных партий

### Пример

```
На витрине лежат яблоки, смешанные из 3 партий:

MixedBatch:
├── Компонент 1: Партия #1234, 5 кг, срок до 05.12
├── Компонент 2: Партия #1567, 3 кг, срок до 08.12
└── Компонент 3: Партия #1890, 2 кг, срок до 10.12

Итого: 10 кг
Эффективный срок: MIN(05.12, 08.12, 10.12) = 05.12
Средняя свежесть: (5×8 + 3×7 + 2×9) / 10 = 7.9
```

### Зачем хранить компоненты?

**Трассировка!** Всегда можем сказать, из каких партий состоит смешанный товар.

### Поля

```typescript
MixedBatch {
  seller,
  product,
  location,                 // Где создан
  
  // Из чего состоит
  components: [{
    batch,                  // → Batch
    quantity,               // Сколько из этой партии
    freshnessAtMixing,      // Свежесть на момент смешивания
    originalExpirationDate, // Исходный срок этой партии
  }],
  
  // Итоговые значения
  totalQuantity,
  effectiveExpirationDate,  // MIN из всех
  effectiveFreshness,       // Средневзвешенная
  
  // Причина
  reason,                   // AUTO_CONSOLIDATION, AUDIT, FOUND_MIXED
  
  isActive,
}
```

---

## Жизненный цикл партии

```
        Приёмка
           ↓
    ┌──────────────┐
    │    ACTIVE    │ ← Партия создана
    └──────┬───────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
    ↓                                     ↓
Продажи                              Истёк срок
(quantity↓)                               ↓
    │                              ┌──────────────┐
    │                              │   EXPIRED    │
    ↓                              └──────┬───────┘
quantity = 0?                             │
    │                                     ↓
    ↓ да                            Списание
┌──────────────┐                          ↓
│   DEPLETED   │                   ┌──────────────┐
└──────────────┘                   │  WRITTEN_OFF │
                                   └──────────────┘
```

---

## Использование

### Создать партию (обычно через Receiving)

```typescript
const batch = await batchPort.create(
  new BatchCommands.CreateBatchCommand({
    seller: sellerId,
    product: productId,
    expirationDate: new Date('2024-12-20'),
    purchasePrice: 80,
    initialQuantity: 100,
    supplier: 'ООО Сады Кубани',
    origin: BatchOrigin.PURCHASE,
  }),
);
```

### Найти партии товара (FEFO)

```typescript
const batches = await batchPort.getByProduct(
  new BatchQueries.GetBatchesByProductQuery({
    seller: sellerId,
    product: productId,
    status: BatchStatus.ACTIVE,
    sortByExpiration: true,  // FEFO — сначала те, что скоро истекают
  }),
);
```

### Найти истекающие партии

```typescript
const expiring = await batchPort.getExpiring(
  new BatchQueries.GetExpiringBatchesQuery({
    seller: sellerId,
    daysUntilExpiration: 3,  // Истекают в ближайшие 3 дня
  }),
);
```

### Обновить свежесть (ручная корректировка)

```typescript
await batchPort.updateFreshness(
  new BatchCommands.UpdateFreshnessCommand({
    batchId,
    newFreshness: 6,  // Было 8, стало 6
    reason: 'Обнаружены признаки увядания',
    performedBy: employeeId,
  }),
);
```

---

## Экспорт

```typescript
import {
  // Порт
  BATCH_PORT,
  BatchPort,
  
  // Схемы
  Batch,
  MixedBatch,
  
  // Енумы
  BatchStatus,
  BatchOrigin,
  MixedBatchReason,
  
  // Команды и запросы
  BatchCommands,
  BatchQueries,
} from 'src/modules/new-inventory/batch';
```
