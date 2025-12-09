# Фаза 2: Партии + Смешивание

> **Срок:** 4-5 дней  
> **Зависимости:** Фаза 1 (нужны ProductTemplate, StorageLocation)

---

## Что делаем в этой фазе

1. **Batch** — партия товара (конкретная поставка)
2. **BatchLocation** — сколько партии лежит в конкретной локации
3. **MixedBatch** — смешанная партия (когда товар из разных поставок смешали)

---

## Зачем это нужно (простыми словами)

### Зачем нужны партии?

Представь: ты купил яблоки два раза.

**Понедельник:** Привезли 50 кг яблок, срок до 15 декабря  
**Среда:** Привезли ещё 30 кг яблок, срок до 20 декабря

У тебя теперь 80 кг яблок, но это **две разные партии**:
- Партия #1: 50 кг, истекает 15.12
- Партия #2: 30 кг, истекает 20.12

**Зачем это важно?**

Когда клиент заказывает 10 кг яблок, нужно дать ему из Партии #1 (которая истекает раньше). Это называется **FEFO — First Expired, First Out**.

Если не отслеживать партии, можно случайно продать свежие яблоки, а старые сгниют.

### Зачем нужен BatchLocation?

Одна партия может быть в **разных местах**:
- Партия #1: 30 кг на складе, 20 кг в магазине
- Партия #2: 25 кг на складе, 5 кг в магазине

BatchLocation говорит: "Вот эта конкретная партия — сколько её в этом конкретном месте".

### Зачем нужен MixedBatch?

В реальности товар **смешивается**. Продавец высыпал остатки из двух коробок в одну — и всё, партии смешались.

MixedBatch — это способ отслеживать такие случаи:
- "Эта коробка — смесь из Партии #1 и Партии #2"
- Срок годности = минимальный из двух
- Для отчётности знаем, откуда что взялось

---

## Порядок разработки

### Шаг 1: Batch (партия товара)

**Что это:** Запись о конкретной поставке товара.

**Файлы:**
- `batch/batch/batch.schema.ts`
- `batch/batch/batch.enums.ts`
- `batch/batch/batch.commands.ts`
- `batch/batch/batch.queries.ts`
- `batch/batch/batch.port.ts`
- `batch/batch/batch.service.ts`
- `batch/batch/batch.module.ts`

**Основные поля:**

```typescript
seller: ObjectId            // Владелец
productTemplate: ObjectId   // Какой товар (из Фазы 1)

batchNumber: string         // "2024-12-01-001"
productionDate: Date        // Когда произведено

// ══════════════════════════════════════════
// СРОКИ ГОДНОСТИ (самое важное!)
// ══════════════════════════════════════════

originalExpirationDate: Date  // Срок от поставщика (не меняется)
effectiveExpirationDate: Date // Расчётный срок (пересчитывается!)
freshnessRemaining: number    // Сколько "свежести" осталось (условные дни)
initialFreshness: number      // Начальная свежесть (для статистики)

// ══════════════════════════════════════════
// ПОСТАВЩИК
// ══════════════════════════════════════════

supplier: string            // Название поставщика
supplierInvoice: string     // Номер накладной
purchasePrice: number       // Закупочная цена за единицу

// ══════════════════════════════════════════
// КОЛИЧЕСТВО
// ══════════════════════════════════════════

initialQuantity: number     // Сколько было изначально
currentQuantity: number     // Сколько осталось сейчас (сумма по всем локациям)

// ══════════════════════════════════════════
// ИСТОРИЯ ЛОКАЦИЙ
// ══════════════════════════════════════════

locationHistory: [{         // Где партия побывала
  location: ObjectId
  arrivedAt: Date
  leftAt: Date
  coefficient: number       // Коэффициент деградации в этой локации
  freshnessConsumed: number // Сколько свежести потратилось
}]

currentLocation: {          // Где сейчас (последняя запись)
  location: ObjectId
  arrivedAt: Date
  coefficient: number
}

// ══════════════════════════════════════════
// РУЧНЫЕ КОРРЕКТИРОВКИ
// ══════════════════════════════════════════

freshnessAdjustments: [{    // Если вручную изменили свежесть
  adjustedAt: Date
  adjustedBy: ObjectId
  previousFreshness: number
  newFreshness: number
  reason: string
}]

status: BatchStatus         // ACTIVE, BLOCKED, EXPIRED, DEPLETED
blockReason: string         // Почему заблокирована
```

**Статусы партии (BatchStatus):**
```
ACTIVE   — можно продавать
BLOCKED  — заблокирована (проверка качества, возврат)
EXPIRED  — срок истёк
DEPLETED — полностью израсходована
```

**Как работает пересчёт сроков:**

```
День 1: Приёмка клубники на склад-холодильник
├── originalExpirationDate: 08.12 (от поставщика)
├── initialFreshness: 7.0 дней
├── freshnessRemaining: 7.0 дней
├── coefficient: 0.4 (холодильник)
└── effectiveExpirationDate: 01.12 + (7.0 / 0.4) = 18.12

День 4: Перемещение в магазин
├── Время в холодильнике: 3 дня
├── Потрачено: 3 × 0.4 = 1.2 дня свежести
├── freshnessRemaining: 7.0 - 1.2 = 5.8 дней
├── coefficient магазина: 1.5
└── effectiveExpirationDate: 04.12 + (5.8 / 1.5) = 08.12
```

---

### Шаг 2: BatchLocation (остаток в локации)

**Что это:** Сколько конкретной партии лежит в конкретном месте.

**Зачем отдельная коллекция?**
- Одна партия может быть в нескольких местах
- Резервирование привязано к конкретной локации
- Удобно считать остатки по локации

**Файлы:**
- `batch/batch-location/batch-location.schema.ts`
- `batch/batch-location/batch-location.enums.ts`
- `batch/batch-location/batch-location.commands.ts`
- `batch/batch-location/batch-location.queries.ts`
- `batch/batch-location/batch-location.port.ts`
- `batch/batch-location/batch-location.service.ts`
- `batch/batch-location/batch-location.module.ts`

**Основные поля:**

```typescript
batch: ObjectId             // Какая партия
storageLocation: ObjectId   // В какой локации

quantity: number            // Сколько лежит
reservedQuantity: number    // Сколько зарезервировано (под заказы)

// Расчётное поле
availableQuantity: number   // quantity - reservedQuantity

degradationCoefficient: number // Коэффициент в этой локации
arrivedAt: Date             // Когда партия прибыла в эту локацию

status: 'ACTIVE' | 'EMPTY'
```

**Связи:**
```
Batch (1) ────────► BatchLocation (many)
                         │
                         └────► StorageLocation (1)
```

**Пример:**
```
Партия #P-001 (Яблоки, 80 кг):
├── BatchLocation #1: Склад, 50 кг, резерв 0
└── BatchLocation #2: Магазин, 30 кг, резерв 5 кг

Итого в партии: 80 кг
Доступно для продажи: 75 кг (80 - 5 резерв)
```

---

### Шаг 3: FEFO логика

**Что это:** First Expired, First Out — сначала продаём то, что истекает раньше.

**Где реализуется:** В BatchLocationService

**Методы:**

```typescript
// Списать по FEFO
async consumeByFefo(input: {
  storageLocationId: string
  productTemplateId: string
  quantity: number
}): Promise<ConsumeResult>

// Зарезервировать по FEFO
async reserveByFefo(input: {
  storageLocationId: string
  productTemplateId: string
  quantity: number
  orderId: string
}): Promise<ReserveResult>

// Снять резерв
async releaseReservation(input: {
  reservationId: string
}): Promise<void>

// Получить агрегированный остаток
async getAggregatedStock(input: {
  storageLocationId: string
  productTemplateId?: string
}): Promise<AggregatedStock>
```

**Как работает consumeByFefo:**

```
Запрос: списать 10 кг яблок из магазина

1. Найти все BatchLocation для яблок в магазине:
   - Партия #P-001: 5 кг, срок до 10.12
   - Партия #P-002: 8 кг, срок до 15.12
   - Партия #P-003: 3 кг, срок до 20.12

2. Отсортировать по effectiveExpirationDate (от ближайшего)

3. Списывать по порядку:
   - Из P-001 списываем 5 кг (вся партия)
   - Из P-002 списываем 5 кг (осталось 3 кг)

4. Вернуть результат:
   consumed: [
     { batch: P-001, quantity: 5 },
     { batch: P-002, quantity: 5 }
   ]
```

---

### Шаг 4: MixedBatch (смешанная партия)

**Что это:** Партия, созданная из нескольких исходных партий.

**Когда создаётся (АВТОМАТИЧЕСКИ, не вручную!):**
1. При инвентаризации — нашли смешанный товар в одной коробке
2. Автоконсолидация — cron объединяет мелкие остатки (<1 кг)
3. После частичного списания — остаток меньше минимума

**Файлы:**
- `batch/mixed-batch/mixed-batch.schema.ts`
- `batch/mixed-batch/mixed-batch.service.ts`
- `batch/mixed-batch/mixed-batch.module.ts`

**Основные поля:**

```typescript
seller: ObjectId
productTemplate: ObjectId

mixedBatchNumber: string    // "MIX-2024-12-05-001"

// Из каких партий смешано
sources: [{
  sourceBatch: ObjectId     // Исходная партия
  sourceType: 'BATCH' | 'MIXED_BATCH'
  quantity: number          // Сколько взяли
  expirationDateAtMix: Date // Срок на момент смешивания
  freshnessAtMix: number    // Свежесть на момент смешивания
  purchasePriceAtMix: number
}]

// Расчётные поля (считаются из sources)
totalQuantity: number                 // Сумма количеств
effectiveExpirationDate: Date         // МИНИМАЛЬНЫЙ из источников
weightedFreshnessRemaining: number    // Средневзвешенная свежесть
weightedPurchasePrice: number         // Средневзвешенная цена

reason: MixingReason        // Почему смешали
location: ObjectId          // Где смешали

status: BatchStatus
```

**Причины смешивания (MixingReason):**
```
PHYSICAL_MIX   — физически смешали (в одной коробке)
CONSOLIDATION  — объединение мелких остатков
REPACKING      — перефасовка
QUALITY_MERGE  — объединение по качеству
```

**Правила расчёта:**

```
Смешиваем:
- Партия A: 3 кг, срок до 10.12, свежесть 5.0, цена 300₽/кг
- Партия B: 2 кг, срок до 12.12, свежесть 7.0, цена 280₽/кг

Результат MixedBatch:
- totalQuantity: 5 кг
- effectiveExpirationDate: 10.12 (минимальный!)
- weightedFreshnessRemaining: (5.0×3 + 7.0×2) / 5 = 5.8
- weightedPurchasePrice: (300×3 + 280×2) / 5 = 292₽/кг
```

**Важно:** После создания MixedBatch:
1. Уменьшаем quantity в исходных BatchLocation
2. Создаём новый BatchLocation для MixedBatch
3. Записываем Movement

---

## Структура файлов после Фазы 2

```
src/modules/new-inventory/
├── core/                    # Из Фазы 1
├── entities/                # Из Фазы 1
│
└── batch/
    ├── batch/
    │   ├── batch.schema.ts
    │   ├── batch.enums.ts
    │   ├── batch.commands.ts
    │   ├── batch.queries.ts
    │   ├── batch.port.ts
    │   ├── batch.service.ts
    │   ├── batch.module.ts
    │   └── index.ts
    │
    ├── batch-location/
    │   ├── batch-location.schema.ts
    │   ├── batch-location.enums.ts
    │   ├── batch-location.commands.ts
    │   ├── batch-location.queries.ts
    │   ├── batch-location.port.ts
    │   ├── batch-location.service.ts  # Тут FEFO логика!
    │   ├── batch-location.module.ts
    │   └── index.ts
    │
    ├── mixed-batch/
    │   ├── mixed-batch.schema.ts
    │   ├── mixed-batch.enums.ts
    │   ├── mixed-batch.service.ts
    │   ├── mixed-batch.module.ts
    │   └── index.ts
    │
    └── index.ts
```

---

## Чек-лист готовности

- [ ] Batch — схема со всеми полями сроков
- [ ] Batch — методы пересчёта effectiveExpirationDate
- [ ] BatchLocation — схема с резервами
- [ ] BatchLocation — FEFO логика (consumeByFefo, reserveByFefo)
- [ ] BatchLocation — агрегация остатков
- [ ] MixedBatch — схема с источниками
- [ ] MixedBatch — автоматическое создание
- [ ] Тесты на FEFO
- [ ] Тесты на пересчёт сроков

---

## Результат Фазы 2

После завершения можно:
1. Создать партию товара с динамическим сроком
2. Разместить партию в локации (BatchLocation)
3. Списать товар по FEFO (сначала то, что портится раньше)
4. Зарезервировать товар под заказ
5. Смешать партии в MixedBatch

**Чего ещё нельзя:**
- Оформить приёмку (документ Receiving)
- Перемещать между локациями (документ Transfer)
- Списывать с документом (документ WriteOff)

Это делаем в Фазе 3.
