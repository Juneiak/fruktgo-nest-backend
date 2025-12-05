# New Inventory — Складской учёт

Полная замена старых модулей складского учёта с партионным учётом, FEFO и динамическими сроками.

---

## Как это работает (простыми словами)

### 1. Что такое партия?

Представь: ты купил у поставщика 100 кг яблок. Все они пришли **одной партией** — у них одна дата производства, один срок годности, одна закупочная цена.

```
Партия (Batch) = товар с одной приёмки
├── Что: Яблоки Голден
├── Сколько: 100 кг
├── Срок до: 2024-12-20
├── Цена закупки: 80₽/кг
└── Откуда: ООО "Сады Кубани"
```

Через неделю купил ещё 50 кг яблок — это уже **другая партия** (другой срок, может другая цена).

### 2. Где лежит товар?

Партия может быть распределена по разным местам:

```
Партия #1234 (100 кг яблок)
├── На складе: 30 кг
├── В магазине А: 50 кг
└── В магазине Б: 20 кг
```

Каждое такое "место" = **BatchLocation** (остаток партии в конкретной локации).

### 3. Как считается остаток?

**Нет отдельного поля "остаток"!** Остаток = сумма всех BatchLocation.

```
Сколько яблок в магазине А?
= BatchLocation партии #1234: 50 кг
+ BatchLocation партии #1567: 30 кг
+ BatchLocation партии #1890: 20 кг
───────────────────────────────
= 100 кг
```

### 4. FEFO — что это?

**First Expired, First Out** — сначала продаём то, что скоро испортится.

```
У нас 3 партии яблок:
├── Партия А: срок до 05.12 (осталось 2 дня)
├── Партия Б: срок до 10.12 (осталось 7 дней)
└── Партия В: срок до 15.12 (осталось 12 дней)

Клиент заказал 10 кг
→ Берём сначала из партии А (она скоро испортится)
```

### 5. Резервирование

Клиент создал заказ → товар **резервируется**, но физически остаётся на месте.

```
До заказа:
  BatchLocation { quantity: 100, reservedQuantity: 0 }
  
Клиент заказал 5 кг:
  BatchLocation { quantity: 100, reservedQuantity: 5 }
  (товар зарезервирован, но ещё на полке)
  
Сборщик собрал заказ:
  BatchLocation { quantity: 95, reservedQuantity: 0 }
  (товар физически отдали)
```

### 6. Смешанные партии

Иногда товар смешивается (например, при инвентаризации нашли кучу яблок, но непонятно из какой партии).

```
MixedBatch = партия из нескольких партий
├── Компонент 1: партия #1234, 5 кг, срок до 05.12
├── Компонент 2: партия #1567, 3 кг, срок до 08.12
└── Компонент 3: партия #1890, 2 кг, срок до 10.12

Итого: 10 кг, срок = MIN(05.12, 08.12, 10.12) = 05.12
```

Система всегда помнит, из каких партий состоит смешанный товар (трассировка).

---

## Структура модуля

```
new-inventory/
│
├── core/                    # Базовые вещи
│   ├── storage-preset/      # "Яблоки хранятся при 0-4°C"
│   ├── storage-conditions/  # "Сейчас в холодильнике 3°C"
│   └── shelf-life-calculator/ # "Срок сократился на 20%"
│
├── entities/                # Основные сущности
│   ├── inventory-product/   # Продукт (что это за товар)
│   ├── product-template/    # Настройки продавца для товара
│   ├── storage-location/    # Локация (где хранится)
│   └── storefront/          # Витрина (что продаётся)
│
├── batch/                   # Партии
│   ├── batch.schema.ts      # Обычная партия
│   └── mixed-batch.schema.ts # Смешанная партия
│
├── batch-location/          # Остатки партий в локациях
│
├── operations/              # Операции
│   ├── receiving/           # Приёмка (создаём партии)
│   ├── transfer/            # Перемещение (склад → магазин)
│   ├── write-off/           # Списание (испортилось)
│   ├── return/              # Возврат (от клиента / поставщику)
│   ├── audit/               # Инвентаризация (пересчёт)
│   └── consolidation/       # Объединение мелких остатков
│
├── movement/                # История всех движений (аудит-лог)
├── reservation/             # Резервы под заказы
├── alerts/                  # Алерты (срок истекает!)
├── pricing/                 # Цены и скидки
└── orchestrator/            # Координатор (всё вместе)
```

---

## Жизненный цикл товара

### Шаг 1: Приёмка

```
Поставщик привёз 100 кг яблок
    ↓
Receiving (приёмка)
    ↓
Создаётся Batch (партия)
    ├── batchNumber: "B-2024-001234"
    ├── product: Яблоки Голден
    ├── quantity: 100 кг
    ├── expirationDate: 2024-12-20
    └── purchasePrice: 80₽/кг
    ↓
Создаётся BatchLocation
    ├── batch: #1234
    ├── location: Склад
    └── quantity: 100 кг
    ↓
Создаётся Movement (запись в истории)
    └── type: RECEIVING, quantity: +100
```

### Шаг 2: Перемещение на витрину

```
Перемещаем 50 кг на витрину магазина
    ↓
Transfer (перемещение)
    ↓
BatchLocation (склад)
    └── quantity: 100 → 50 кг
    ↓
BatchLocation (магазин) — создаётся новый
    └── quantity: 50 кг
    ↓
Movement × 2
    ├── TRANSFER_OUT (склад): -50
    └── TRANSFER_IN (магазин): +50
```

### Шаг 3: Заказ

```
Клиент заказал 5 кг яблок
    ↓
Reservation (резерв)
    ↓
BatchLocation (магазин)
    ├── quantity: 50 кг (не меняется)
    └── reservedQuantity: 0 → 5 кг
```

### Шаг 4: Сборка и отдача

```
Сборщик собрал заказ
    ↓
BatchLocation (магазин)
    ├── quantity: 50 → 45 кг
    └── reservedQuantity: 5 → 0 кг
    ↓
Movement
    └── type: SALE, quantity: -5, orderId: ...
```

### Шаг 5: Списание

```
Часть яблок испортилась (10 кг)
    ↓
WriteOff (списание)
    ↓
BatchLocation (магазин)
    └── quantity: 45 → 35 кг
    ↓
Movement
    └── type: WRITE_OFF, quantity: -10, reason: EXPIRED
```

---

## Ключевые концепции

### Единый остаток

```
Остаток товара = SUM(BatchLocation.quantity)

НЕТ отдельного поля "stockQuantity"!
Всегда считается динамически из BatchLocation.
```

### FEFO (First Expired, First Out)

```
При резервировании/продаже:
1. Находим все BatchLocation товара в локации
2. Сортируем по expirationDate (ASC)
3. Берём сначала те, что скоро истекают
```

### Мягкое резервирование

```
Резерв = пометка "это уже занято"
Товар физически остаётся на месте до сборки
```

### Трассировка

```
Каждое движение товара → Movement
Всегда можем посмотреть:
- Откуда пришла партия
- Куда перемещалась
- Сколько продали
- Сколько списали
```

---

## Основные операции

### Приёмка (Receiving)

**Что:** Принимаем товар от поставщика.

**Что происходит:**
1. Создаём `Receiving` (документ приёмки)
2. Для каждого товара создаём `Batch` (партию)
3. Создаём `BatchLocation` (кладём в локацию)
4. Записываем `Movement` (история)

**Пример:**
```typescript
await orchestrator.createReceiving({
  destination: { type: 'SHOP', shopId },
  supplier: 'ООО Сады',
  items: [
    { productId, quantity: 100, expirationDate, purchasePrice: 80 }
  ],
});
```

### Перемещение (Transfer)

**Что:** Перемещаем товар между локациями (склад → магазин).

**Что происходит:**
1. Уменьшаем `quantity` в источнике
2. Увеличиваем `quantity` в назначении
3. Если включена динамика — пересчитываем срок
4. Записываем `Movement` × 2 (OUT + IN)

**Пример:**
```typescript
await orchestrator.createTransfer({
  source: { type: 'WAREHOUSE', warehouseId },
  destination: { type: 'SHOP', shopId },
  items: [{ batchId, quantity: 50 }],
});
```

### Списание (WriteOff)

**Что:** Списываем товар (испортился, украли, использовали).

**Что происходит:**
1. Уменьшаем `quantity` в `BatchLocation`
2. Если `quantity = 0` → `status = WRITTEN_OFF`
3. Записываем `Movement`

**Причины списания:**
- `EXPIRED` — истёк срок
- `DAMAGED` — повреждён
- `LOST` — утерян
- `THEFT` — кража
- `SHRINKAGE` — усушка
- `FOR_PRODUCTION` — использован в производстве

### Резервирование (Reservation)

**Что:** Резервируем товар под заказ.

**Что происходит:**
1. Находим партии по FEFO
2. Увеличиваем `reservedQuantity`
3. Создаём `Reservation`

**Выполнение резерва (сборка):**
1. Уменьшаем `quantity`
2. Сбрасываем `reservedQuantity`
3. Записываем `Movement` (SALE)

### Инвентаризация (Audit)

**Что:** Пересчитываем фактические остатки.

**Что происходит:**
1. Система показывает ожидаемые остатки
2. Сотрудник вводит фактические
3. Расхождения разрешаются:
   - Недостача → списание
   - Излишки → корректировка
   - Смешанный товар → создаём `MixedBatch`

---

## Цены и скидки

### Онлайн vs Офлайн

```
StorefrontProduct {
  onlinePrice: 120₽,   // В приложении
  offlinePrice: 120₽,  // На кассе
}
```

**Почему разные:**
- Онлайн можно менять мгновенно
- Офлайн требует смены ценников

### Автоскидки по сроку

```
Срок истекает через 3 дня → скидка 30% (только онлайн!)
Срок истекает через 5 дней → скидка 20%
Срок истекает через 7 дней → скидка 10%
```

**Офлайн цена НЕ меняется автоматически** (нужно физически менять ценники).

### Маржа

```
Закупочная цена: 80₽
Продажная цена: 120₽
Маржа: 40₽ (33%)

Статус:
- HEALTHY (> 15%)
- LOW (5-15%)
- NEGATIVE (< 5%)
```

---

## Алерты

Система автоматически создаёт алерты:

```
EXPIRING_CRITICAL — срок истекает завтра!
EXPIRING_SOON — срок истекает через 3-7 дней
EXPIRED — срок истёк
TEMPERATURE_DEVIATION — температура вне нормы
LOW_STOCK — остаток ниже минимума
OUT_OF_STOCK — нет в наличии
```

**Алерты НЕ блокируют операции** — это информирование, не запрет.

---

## Использование

### Импорт

```typescript
import {
  // Оркестратор (главная точка входа)
  INVENTORY_ORCHESTRATOR,
  InventoryOrchestrator,
  
  // Сущности
  INVENTORY_PRODUCT_PORT,
  InventoryProductPort,
  
  // Партии
  BATCH_PORT,
  BatchPort,
  
  // Остатки
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  
  // Операции
  RECEIVING_PORT,
  ReceivingPort,
  
  // Команды и запросы
  InventoryProductCommands,
  BatchQueries,
} from 'src/modules/new-inventory';
```

### Пример: приёмка

```typescript
@Inject(INVENTORY_ORCHESTRATOR)
private orchestrator: InventoryOrchestrator;

// Принимаем товар
await this.orchestrator.createReceiving({
  sellerId,
  destination: { type: LocationType.SHOP, shopId },
  supplier: 'ООО Сады Кубани',
  items: [
    {
      productId,
      quantity: 100,
      expirationDate: new Date('2024-12-20'),
      purchasePrice: 80,
    },
  ],
  employeeId,
});
```

### Пример: резервирование под заказ

```typescript
// Резервируем товар (FEFO автоматически)
const reservation = await this.orchestrator.reserveForOrder({
  orderId,
  shopId,
  items: [
    { productId: 'apples', quantity: 5 },
  ],
});

// Выполняем резерв (при сборке)
await this.orchestrator.fulfillReservation({
  reservationId: reservation._id,
  fulfilledItems: [
    { productId: 'apples', actualQuantity: 4.8 },
  ],
  employeeId,
});
```

### Пример: проверка остатков

```typescript
@Inject(BATCH_LOCATION_PORT)
private batchLocationPort: BatchLocationPort;

// Сколько товара в магазине?
const stock = await this.batchLocationPort.getProductStockInLocation(
  new BatchLocationQueries.GetProductStockInLocationQuery({
    seller: sellerId,
    product: productId,
    locationType: LocationType.SHOP,
    locationId: shopId,
    sortByExpiration: true, // FEFO
  }),
);

// stock = [
//   { batch: ..., quantity: 30, expirationDate: '2024-12-05' },
//   { batch: ..., quantity: 20, expirationDate: '2024-12-10' },
// ]
```

---

## Связи с другими модулями

```
new-inventory
    │
    ├─→ Shop (магазины как локации)
    ├─→ Seller (владелец продуктов и партий)
    ├─→ Order (резервирование, списание при сборке)
    ├─→ Employee (кто выполняет операции)
    └─→ Product (опционально, мастер-каталог)
```

---

## Подробная документация

| Модуль | README |
|--------|--------|
| Core | [core/README.md](./core/README.md) |
| Entities | [entities/README.md](./entities/README.md) |
| Batch | [batch/README.md](./batch/README.md) |
| BatchLocation | [batch-location/README.md](./batch-location/README.md) |
| Operations | [operations/README.md](./operations/README.md) |
| Movement | [movement/README.md](./movement/README.md) |
| Reservation | [reservation/README.md](./reservation/README.md) |
| Alerts | [alerts/README.md](./alerts/README.md) |
| Pricing | [pricing/README.md](./pricing/README.md) |
| Orchestrator | [orchestrator/README.md](./orchestrator/README.md) |

---

## Архитектурные документы

- **Полный план реализации:** [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)
- **Архитектурный обзор:** [inventory-system-overview.md](./inventory-system-overview.md)
