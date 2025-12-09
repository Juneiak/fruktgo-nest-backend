# Фаза 3: Операции + История

> **Срок:** 6-8 дней  
> **Зависимости:** Фаза 1, Фаза 2 (нужны ProductTemplate, StorageLocation, Batch, BatchLocation)

---

## Что делаем в этой фазе

1. **Receiving** — приёмка товара от поставщика
2. **Transfer** — перемещение между локациями
3. **WriteOff** — списание (порча, кража, истёк срок)
4. **Movement** — история всех движений
5. **Reservation** — резервирование под онлайн-заказы

---

## Зачем это нужно (простыми словами)

### Зачем нужна Приёмка (Receiving)?

Когда приезжает машина с товаром, нужно:
1. Проверить, что привезли то, что заказывали
2. Записать сроки годности
3. Создать партии в системе
4. Разместить товар на складе

Receiving — это **документ**, который всё это фиксирует.

### Зачем нужно Перемещение (Transfer)?

Товар нужно перевозить:
- Со склада в магазин
- Из одного магазина в другой
- Из торгового зала в холодильник

При перемещении **пересчитываются сроки** (помнишь коэффициенты из Фазы 1?).

Transfer — это **документ** о перевозке с отслеживанием статуса.

### Зачем нужно Списание (WriteOff)?

Товар может:
- Испортиться
- Сгнить
- Быть украден
- Истечь срок годности

WriteOff — это официальное удаление товара из учёта с указанием причины.

### Зачем нужна История (Movement)?

Любое изменение остатка должно быть записано:
- Кто изменил
- Когда
- Почему
- Сколько было до и после

Это нужно для:
- Аудита ("куда делись 10 кг яблок?")
- Аналитики ("сколько списали за месяц?")
- Отмены ошибок ("упс, записали не туда")

### Зачем нужно Резервирование (Reservation)?

Когда клиент делает онлайн-заказ, товар нужно **зарезервировать**:
- Чтобы его не продали другому клиенту
- Чтобы сборщик знал, откуда брать

Но резерв **мягкий** — офлайн-покупатель может "отобрать" товар.

---

## Порядок разработки

### Шаг 1: Movement (история движений)

**Что это:** Запись о любом изменении остатка.

**Делаем первым**, потому что все операции будут создавать Movement.

**Файлы:**
- `movement/movement.schema.ts`
- `movement/movement.enums.ts`
- `movement/movement.commands.ts`
- `movement/movement.queries.ts`
- `movement/movement.port.ts`
- `movement/movement.service.ts`
- `movement/movement.module.ts`

**Основные поля:**

```typescript
// Когда
createdAt: Date

// Что изменилось
type: MovementType          // RECEIVING, SALE, TRANSFER_IN...
batch: ObjectId             // Какая партия
storageLocation: ObjectId   // В какой локации

// Сколько
quantityChange: number      // +10 или -5
balanceBefore: number       // Было
balanceAfter: number        // Стало

// Документ-основание
document: {
  type: 'RECEIVING' | 'TRANSFER' | 'WRITE_OFF' | 'ORDER' | 'RETURN' | 'AUDIT'
  id: ObjectId
  number: string            // Номер документа
}

// Кто сделал
actor: {
  type: 'EMPLOYEE' | 'SELLER' | 'SYSTEM'
  id: ObjectId
  name: string
}

// Дополнительно
comment: string
```

**Типы движений (MovementType):**
```
// ПРИХОД (quantityChange > 0)
RECEIVING         — приёмка от поставщика
TRANSFER_IN       — приход по перемещению
RETURN_TO_STOCK   — возврат на полку
ADJUSTMENT_PLUS   — корректировка +

// РАСХОД (quantityChange < 0)
SALE              — онлайн-продажа
OFFLINE_SALE      — офлайн-продажа
TRANSFER_OUT      — отправка по перемещению
WRITE_OFF         — списание
ADJUSTMENT_MINUS  — корректировка -

// РЕЗЕРВИРОВАНИЕ (не меняет quantity, меняет reservedQuantity)
RESERVATION       — создание резерва
RESERVATION_RELEASE — снятие резерва
```

**Пример записей:**
```
#1: RECEIVING, +50 кг, Партия P-001, Склад, было 0, стало 50
#2: TRANSFER_OUT, -20 кг, Партия P-001, Склад, было 50, стало 30
#3: TRANSFER_IN, +20 кг, Партия P-001, Магазин, было 0, стало 20
#4: SALE, -3 кг, Партия P-001, Магазин, было 20, стало 17
```

---

### Шаг 2: Reservation (резервирование)

**Что это:** Резерв товара под онлайн-заказ.

**Файлы:**
- `reservation/reservation.schema.ts`
- `reservation/reservation.enums.ts`
- `reservation/reservation.commands.ts`
- `reservation/reservation.queries.ts`
- `reservation/reservation.port.ts`
- `reservation/reservation.service.ts`
- `reservation/reservation.module.ts`

**Основные поля:**

```typescript
order: ObjectId             // Для какого заказа
shop: ObjectId              // В каком магазине

// Что зарезервировано
items: [{
  batch: ObjectId           // Какая партия
  batchLocation: ObjectId   // В какой локации
  productTemplate: ObjectId // Какой товар
  quantity: number          // Сколько
}]

status: ReservationStatus   // ACTIVE, CONSUMED, RELEASED, EXPIRED
expiresAt: Date             // Когда резерв автоматически снимется
createdAt: Date
```

**Статусы резерва:**
```
ACTIVE   — резерв действует
CONSUMED — заказ собран, товар списан
RELEASED — резерв отменён (отмена заказа)
EXPIRED  — резерв истёк по времени
```

**Как работает "мягкое" резервирование:**

```
Состояние: Яблоки 50 кг, резерв 8 кг
├── Доступно онлайн: 42 кг
├── Зарезервировано: 8 кг (заказы #1234, #1235)

Офлайн-покупатель хочет 45 кг:
├── Доступно без резерва: 42 кг
├── Не хватает: 3 кг
└── Варианты:
    1. "Извините, только 42 кг"
    2. "Возьмём 3 кг из резерва, уведомим онлайн-клиента"

Если выбрали вариант 2:
├── Система предупреждает: "⚠️ Затронут резерв заказа #1234"
├── Сотрудник подтверждает
├── Резерв #1234 уменьшается или отменяется
├── Клиенту #1234 отправляется уведомление
└── Продажа офлайн оформляется
```

---

### Шаг 3: Receiving (приёмка)

**Что это:** Документ о приёмке товара от поставщика.

**Файлы:**
- `operations/receiving/receiving.schema.ts`
- `operations/receiving/receiving.enums.ts`
- `operations/receiving/receiving.commands.ts`
- `operations/receiving/receiving.queries.ts`
- `operations/receiving/receiving.port.ts`
- `operations/receiving/receiving.service.ts`
- `operations/receiving/receiving.module.ts`

**Основные поля:**

```typescript
seller: ObjectId
documentNumber: string      // "RCV-2024-12-05-001"

// Куда принимаем
destinationType: 'SHOP' | 'WAREHOUSE'
destinationLocation: ObjectId // StorageLocation

// Поставщик
supplier: string
supplierInvoice: string
deliveryDate: Date

// Позиции
items: [{
  productTemplate: ObjectId
  
  // Ожидание vs факт
  expectedQuantity: number    // По накладной
  actualQuantity: number      // Фактически (может отличаться!)
  
  // Срок годности
  expirationDate: Date
  productionDate: Date
  
  // Цена
  purchasePrice: number
  
  // После подтверждения
  createdBatch: ObjectId      // Созданная партия
}]

// Документы
photos: ObjectId[]            // Фото накладных, товара
notes: string

status: ReceivingStatus
createdBy: ObjectId
confirmedBy: ObjectId
confirmedAt: Date
```

**Статусы приёмки:**
```
DRAFT     — черновик (можно редактировать)
CONFIRMED — подтверждена (партии созданы, нельзя редактировать)
CANCELLED — отменена
```

**Workflow приёмки:**

```
1. СОЗДАНИЕ (status: DRAFT)
   ├── Вводим: поставщика, накладную, позиции
   ├── Можно редактировать
   └── Партии ещё НЕ созданы

2. ПОДТВЕРЖДЕНИЕ (status: CONFIRMED)
   Для каждой позиции:
   ├── a) Создаём Batch:
   │   ├── originalExpirationDate = item.expirationDate
   │   ├── initialFreshness = из ProductTemplate.storageConditions
   │   ├── freshnessRemaining = initialFreshness
   │   └── effectiveExpirationDate = рассчитать через ShelfLifeCalculator
   │
   ├── b) Создаём BatchLocation:
   │   ├── batch = созданная партия
   │   ├── storageLocation = destinationLocation
   │   └── quantity = actualQuantity
   │
   └── c) Создаём Movement:
       ├── type = RECEIVING
       ├── quantityChange = +actualQuantity
       └── document = эта приёмка

   После всех позиций:
   └── Обновляем агрегированные остатки
```

**Пример:**
```
Приёмка #RCV-001:
├── Поставщик: "ООО Сады Кубани"
├── Накладная: #45678
├── Локация: Склад-холодильник
│
├── Позиция 1: Клубника
│   ├── Ожидали: 50 кг
│   ├── Получили: 48 кг (усушка)
│   ├── Срок: до 15.12
│   ├── Цена: 300 ₽/кг
│   └── → Создана Партия P-001
│
└── Позиция 2: Яблоки
    ├── Ожидали: 100 кг
    ├── Получили: 100 кг
    ├── Срок: до 30.12
    ├── Цена: 80 ₽/кг
    └── → Создана Партия P-002
```

---

### Шаг 4: Transfer (перемещение)

**Что это:** Документ о перемещении товара между локациями.

**Файлы:**
- `operations/transfer/transfer.schema.ts`
- `operations/transfer/transfer.enums.ts`
- `operations/transfer/transfer.commands.ts`
- `operations/transfer/transfer.queries.ts`
- `operations/transfer/transfer.port.ts`
- `operations/transfer/transfer.service.ts`
- `operations/transfer/transfer.module.ts`

**Основные поля:**

```typescript
seller: ObjectId
documentNumber: string      // "TRF-2024-12-05-001"

// Откуда
sourceLocation: ObjectId    // StorageLocation

// Куда
targetLocation: ObjectId    // StorageLocation

// Позиции
items: [{
  batch: ObjectId           // Какая партия
  quantity: number          // Сколько перемещаем
  
  // Рассчитываются при отправке
  freshnessBeforeTransfer: number
  freshnessAfterTransfer: number
  newEffectiveExpiration: Date
}]

status: TransferStatus
createdBy: ObjectId
sentBy: ObjectId            // Кто отправил
sentAt: Date
receivedBy: ObjectId        // Кто принял
receivedAt: Date

notes: string
```

**Статусы перемещения:**
```
DRAFT    — черновик
SENT     — отправлено (товар "в пути")
RECEIVED — получено (завершено)
CANCELLED — отменено
```

**Workflow перемещения:**

```
1. СОЗДАНИЕ (status: DRAFT)
   ├── Выбираем: откуда, куда
   ├── Добавляем позиции (партии)
   └── Можно редактировать

2. ОТПРАВКА (status: SENT)
   Для каждой позиции:
   ├── a) Уменьшаем quantity в BatchLocation источника
   │
   ├── b) Рассчитываем новую свежесть:
   │   ├── Время в старой локации = now - arrivedAt
   │   ├── Потрачено = время × coefficient_старый
   │   ├── freshnessAfterTransfer = freshnessRemaining - потрачено
   │   └── newEffectiveExpiration = пересчитать
   │
   └── c) Создаём Movement:
       ├── type = TRANSFER_OUT
       └── в источнике

3. ПОЛУЧЕНИЕ (status: RECEIVED)
   Для каждой позиции:
   ├── a) Создаём/обновляем BatchLocation в получателе
   │
   ├── b) Обновляем Batch:
   │   ├── freshnessRemaining = freshnessAfterTransfer
   │   ├── effectiveExpirationDate = newEffectiveExpiration
   │   └── Добавляем запись в locationHistory
   │
   └── c) Создаём Movement:
       ├── type = TRANSFER_IN
       └── в получателе
```

**Пример с пересчётом сроков:**

```
Перемещение #TRF-001:
├── Откуда: Склад-холодильник (коэф. 0.4)
├── Куда: Магазин (коэф. 1.3)
│
└── Позиция: Клубника, Партия P-001, 20 кг
    │
    ├── ДО перемещения:
    │   ├── freshnessRemaining: 7.0 дней
    │   ├── В холодильнике: 3 дня
    │   └── effectiveExpirationDate: 18.12
    │
    └── ПОСЛЕ перемещения:
        ├── Потрачено: 3 × 0.4 = 1.2 дня
        ├── freshnessRemaining: 7.0 - 1.2 = 5.8 дней
        ├── В магазине (коэф. 1.3): 5.8 / 1.3 = 4.5 дня
        └── effectiveExpirationDate: +4.5 дня = 09.12
```

---

### Шаг 5: WriteOff (списание)

**Что это:** Документ о списании товара.

**Файлы:**
- `operations/write-off/write-off.schema.ts`
- `operations/write-off/write-off.enums.ts`
- `operations/write-off/write-off.commands.ts`
- `operations/write-off/write-off.queries.ts`
- `operations/write-off/write-off.port.ts`
- `operations/write-off/write-off.service.ts`
- `operations/write-off/write-off.module.ts`

**Основные поля:**

```typescript
seller: ObjectId
documentNumber: string      // "WRO-2024-12-05-001"

// Где списываем
storageLocation: ObjectId

// Позиции
items: [{
  batch: ObjectId
  quantity: number
  reason: WriteOffReason
  comment: string
}]

// Общая причина (если одна для всех)
reason: WriteOffReason
photos: ObjectId[]          // Фото испорченного товара

status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED'
createdBy: ObjectId
confirmedBy: ObjectId
confirmedAt: Date
```

**Причины списания (WriteOffReason):**
```
EXPIRED        — истёк срок годности
DAMAGED        — повреждён
SPOILED        — испортился (гниль, плесень)
THEFT          — кража
QUALITY_ISSUE  — проблемы с качеством
INVENTORY_DIFF — недостача при инвентаризации
FOR_PRODUCTION — на производство (для homemade)
SAMPLE         — образец/дегустация
OTHER          — прочее
```

**Workflow списания:**

```
1. СОЗДАНИЕ (status: DRAFT)
   ├── Выбираем локацию
   ├── Добавляем позиции с причинами
   └── Прикрепляем фото

2. ПОДТВЕРЖДЕНИЕ (status: CONFIRMED)
   Для каждой позиции:
   ├── a) Уменьшаем quantity в BatchLocation
   │
   ├── b) Если quantity = 0, меняем статус BatchLocation на EMPTY
   │
   ├── c) Обновляем Batch.currentQuantity
   │   └── Если 0, меняем статус на DEPLETED
   │
   └── d) Создаём Movement:
       ├── type = WRITE_OFF
       └── quantityChange = -quantity
```

---

## Структура файлов после Фазы 3

```
src/modules/new-inventory/
├── core/                    # Из Фазы 1
├── entities/                # Из Фазы 1
├── batch/                   # Из Фазы 2
│
├── movement/
│   ├── movement.schema.ts
│   ├── movement.enums.ts
│   ├── movement.commands.ts
│   ├── movement.queries.ts
│   ├── movement.port.ts
│   ├── movement.service.ts
│   ├── movement.module.ts
│   └── index.ts
│
├── reservation/
│   ├── reservation.schema.ts
│   ├── reservation.enums.ts
│   ├── reservation.commands.ts
│   ├── reservation.queries.ts
│   ├── reservation.port.ts
│   ├── reservation.service.ts
│   ├── reservation.module.ts
│   └── index.ts
│
└── operations/
    ├── receiving/
    │   ├── receiving.schema.ts
    │   ├── receiving.enums.ts
    │   ├── receiving.commands.ts
    │   ├── receiving.queries.ts
    │   ├── receiving.port.ts
    │   ├── receiving.service.ts
    │   ├── receiving.module.ts
    │   └── index.ts
    │
    ├── transfer/
    │   ├── transfer.schema.ts
    │   ├── transfer.enums.ts
    │   ├── transfer.commands.ts
    │   ├── transfer.queries.ts
    │   ├── transfer.port.ts
    │   ├── transfer.service.ts
    │   ├── transfer.module.ts
    │   └── index.ts
    │
    ├── write-off/
    │   ├── write-off.schema.ts
    │   ├── write-off.enums.ts
    │   ├── write-off.commands.ts
    │   ├── write-off.queries.ts
    │   ├── write-off.port.ts
    │   ├── write-off.service.ts
    │   ├── write-off.module.ts
    │   └── index.ts
    │
    └── index.ts
```

---

## Чек-лист готовности

- [ ] Movement — схема, все типы движений
- [ ] Movement — автоматическое создание при операциях
- [ ] Reservation — схема с товарами
- [ ] Reservation — мягкое резервирование
- [ ] Reservation — автоистечение по времени
- [ ] Receiving — полный workflow DRAFT → CONFIRMED
- [ ] Receiving — создание Batch и BatchLocation
- [ ] Transfer — workflow DRAFT → SENT → RECEIVED
- [ ] Transfer — пересчёт сроков при перемещении
- [ ] WriteOff — workflow с причинами
- [ ] Все операции транзакционные
- [ ] Тесты на каждую операцию

---

## Результат Фазы 3

После завершения можно:
1. Принять товар от поставщика (создаются партии)
2. Переместить товар между локациями (пересчитываются сроки)
3. Списать испорченный товар
4. Зарезервировать товар под онлайн-заказ
5. Видеть историю всех движений

**Это уже рабочая складская система!**

Дальнейшие фазы добавляют:
- Инвентаризацию (Фаза 4)
- Возвраты (Фаза 5)
- Продвинутое ценообразование (Фаза 6)
