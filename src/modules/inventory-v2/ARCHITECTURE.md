# Архитектура складского модуля

> **Для кого:** Разработчики, архитекторы  
> **Цель:** Понять структуру модуля перед написанием кода

---

## Оглавление

1. [Общая структура](#1-общая-структура) — какие папки/модули будут
2. [Сущности](#2-сущности) — что храним в базе
3. [Сервисы и порты](#3-сервисы-и-порты) — кто что делает
4. [Процессы (Orchestrators)](#4-процессы-orchestrators) — сложные операции
5. [Правила и инварианты](#5-правила-и-инварианты) — что нельзя нарушать
6. [Интеграция с другими модулями](#6-интеграция-с-другими-модулями) — связи наружу
7. [Три уровня (LITE/STANDARD/PRO)](#7-три-уровня-litestandardpro) — как это влияет на код
8. [Миграция в микросервис](#8-миграция-в-микросервис) — что учесть заранее

---

## 1. Общая структура

> **Кратко:** Один большой модуль `inventory` с подмодулями. Потом легко выделить в микросервис.

```
src/modules/inventory/
│
├── index.ts                      # Barrel export (всё наружу)
├── inventory.module.ts           # Главный модуль
│
├── core/                         # Ядро: расчёты и справочники
│   ├── storage-preset/           # Пресеты коэффициентов (BERRIES, CITRUS...)
│   ├── shelf-life/               # Расчёт сроков годности
│   └── defaults/                 # Дефолты по категориям (срок, цена)
│
├── entities/                     # Базовые сущности (схемы MongoDB)
│   ├── product-template/         # Шаблон товара
│   ├── storage-location/         # Локация (склад/магазин)
│   ├── storefront/               # Витрина магазина
│   └── storefront-product/       # Товар на витрине (с ценой)
│
├── batch/                        # Партии товара
│   ├── batch/                    # Партия (срок, количество, цена)
│   └── batch-location/           # Остаток партии в локации
│
├── operations/                   # Операции (изменяют остатки)
│   ├── receiving/                # Приёмка
│   ├── write-off/                # Списание
│   ├── transfer/                 # Перемещение (PRO)
│   ├── sale/                     # Продажа (списание по FIFO)
│   ├── return/                   # Возврат
│   └── audit/                    # Инвентаризация
│
├── reservation/                  # Резервирование под заказы
│
├── alerts/                       # Алерты по срокам
│
├── pricing/                      # Ценообразование и автоскидки
│
└── orchestrator/                 # Координатор операций
```

### Почему так?

- **core/** — чистая логика без базы, легко тестировать
- **entities/** — схемы и CRUD, без бизнес-логики
- **operations/** — бизнес-операции, используют entities
- **orchestrator/** — координирует несколько операций в транзакции

---

## 2. Сущности

> **Кратко:** 7 основных сущностей. Партии хранятся всегда, даже в LITE.

### 2.1 ProductTemplate (Шаблон товара)

> Описание товара: название, категория, условия хранения. НЕ хранит остатки.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `sellerId` | ObjectId | Владелец |
| `name` | string | "Яблоки Голден" |
| `sku` | string | Артикул |
| `category` | string | "fruits" |
| `productType` | enum | PERISHABLE, SHELF_STABLE, FROZEN... |
| `measuringScale` | enum | KILOGRAM, PIECE, LITER... |
| `defaultShelfLifeDays` | number | Срок по умолчанию (для LITE) |
| `storageConditions` | object | Идеальные условия (температура, влажность) |
| `storagePreset` | enum | BERRIES, CITRUS, APPLES_PEARS... |
| `freshnessManagementEnabled` | boolean | Premium-функция |
| `nutrition` | object | КБЖУ |
| `isHomemade` | boolean | Собственное производство |
| `homemadeDetails` | object | Рецепт, ингредиенты, время |

**Связи:**
- `sellerId` → Seller (внешний модуль)
- Один ProductTemplate → много StorefrontProduct

---

### 2.2 StorageLocation (Локация)

> Где хранится товар: склад или магазин.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `sellerId` | ObjectId | Владелец |
| `shopId` | ObjectId? | Если это магазин |
| `name` | string | "Центральный склад" |
| `type` | enum | WAREHOUSE, SHOP |
| `storageZone` | enum | AMBIENT, CHILLED, FROZEN |
| `currentConditions` | object | Текущие температура/влажность |
| `freshnessManagementEnabled` | boolean | Включён ли пересчёт сроков |

**Связи:**
- `sellerId` → Seller
- `shopId` → Shop (если тип SHOP)
- Одна Location → много BatchLocation

---

### 2.3 Storefront (Витрина)

> Онлайн-представление магазина. Что видит клиент.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `shopId` | ObjectId | К какому магазину |
| `sellerId` | ObjectId | Владелец |
| `isActive` | boolean | Включена ли витрина |

**Связи:**
- `shopId` → Shop
- Одна Storefront → много StorefrontProduct

---

### 2.4 StorefrontProduct (Товар на витрине)

> Товар, который видит клиент. Содержит цены и остаток.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `storefrontId` | ObjectId | На какой витрине |
| `productTemplateId` | ObjectId | Какой товар |
| `locationId` | ObjectId | Откуда берётся (магазин) |
| `pricing` | object | Цены (онлайн, офлайн, опт) |
| `autoDiscount` | object | Автоскидка по сроку |
| `stock` | object | {total, reserved, available} |
| `isVisible` | boolean | Показывать клиенту |
| `livePhotos` | array | Фото с витрины |

**Связи:**
- `storefrontId` → Storefront
- `productTemplateId` → ProductTemplate
- `locationId` → StorageLocation

**Важно:** `stock` — это агрегированные данные, пересчитываются при изменении BatchLocation.

---

### 2.5 Batch (Партия)

> Конкретная поставка товара с датой и ценой. ВСЕГДА создаётся, даже в LITE.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `sellerId` | ObjectId | |
| `productTemplateId` | ObjectId | Какой товар |
| `expirationDate` | Date | Срок годности |
| `purchasePrice` | number | Закупочная цена |
| `supplier` | string? | Поставщик (PRO) |
| `invoiceNumber` | string? | Накладная (PRO) |
| `receivedAt` | Date | Когда принят |
| `status` | enum | ACTIVE, DEPLETED, EXPIRED |

**Связи:**
- `productTemplateId` → ProductTemplate
- Одна Batch → много BatchLocation

---

### 2.6 BatchLocation (Остаток партии в локации)

> Сколько конкретной партии лежит в конкретном месте.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `batchId` | ObjectId | Какая партия |
| `locationId` | ObjectId | Где лежит |
| `quantity` | number | Сколько |
| `reserved` | number | Зарезервировано |
| `effectiveExpirationDate` | Date? | Пересчитанный срок (PRO) |

**Связи:**
- `batchId` → Batch
- `locationId` → StorageLocation

**Индексы:**
- `{ locationId, batchId }` — уникальный
- `{ locationId, effectiveExpirationDate }` — для FIFO-запросов

---

### 2.7 Reservation (Резерв)

> Товар, отложенный под онлайн-заказ.

| Поле | Тип | Описание |
|------|-----|----------|
| `_id` | ObjectId | |
| `orderId` | ObjectId | Для какого заказа |
| `locationId` | ObjectId | В каком магазине |
| `items` | array | [{batchLocationId, quantity}] |
| `status` | enum | PENDING, CONFIRMED, RELEASED, CANCELLED |
| `expiresAt` | Date | Когда истекает (если не подтверждён) |

**Связи:**
- `orderId` → Order (внешний модуль)
- `items[].batchLocationId` → BatchLocation

---

### Диаграмма связей

```
┌─────────────────┐         ┌─────────────────┐
│     Seller      │◄────────│ ProductTemplate │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │      Batch      │
         │                  └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ StorageLocation │◄────────│  BatchLocation  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ (если SHOP)               │ (агрегируется)
         ▼                           │
┌─────────────────┐                  │
│      Shop       │                  │
└────────┬────────┘                  │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Storefront    │◄────────│StorefrontProduct│
└─────────────────┘         │   .stock        │
                            └─────────────────┘
```

---

## 3. Сервисы и порты

> **Кратко:** Каждый подмодуль имеет свой Port (интерфейс) и Service (реализация).

### 3.1 Порты (публичный API модуля)

| Порт | Назначение |
|------|------------|
| `PRODUCT_TEMPLATE_PORT` | CRUD шаблонов товаров |
| `STORAGE_LOCATION_PORT` | CRUD локаций |
| `STOREFRONT_PORT` | CRUD витрин |
| `STOREFRONT_PRODUCT_PORT` | CRUD товаров на витрине |
| `BATCH_PORT` | Работа с партиями |
| `RESERVATION_PORT` | Резервирование |
| `ALERT_PORT` | Алерты по срокам |
| `PRICING_PORT` | Ценообразование |

### 3.2 Главный порт модуля

```typescript
// src/modules/inventory/inventory.port.ts

interface InventoryPort {
  // Приёмка
  receive(cmd: ReceiveCommand): Promise<Batch>;
  
  // Списание
  writeOff(cmd: WriteOffCommand): Promise<void>;
  
  // Продажа (списание по FIFO)
  sell(cmd: SellCommand): Promise<void>;
  
  // Резервирование
  reserve(cmd: ReserveCommand): Promise<Reservation>;
  releaseReservation(reservationId: string): Promise<void>;
  
  // Перемещение (PRO)
  transfer(cmd: TransferCommand): Promise<void>;
  
  // Инвентаризация
  startAudit(cmd: StartAuditCommand): Promise<Audit>;
  submitAuditResults(cmd: SubmitAuditCommand): Promise<void>;
  
  // Запросы
  getStock(locationId: string, productTemplateId: string): Promise<StockInfo>;
  getBatches(locationId: string, productTemplateId: string): Promise<BatchInfo[]>;
  getExpiringProducts(locationId: string, daysAhead: number): Promise<ExpiringProduct[]>;
}
```

### 3.3 Вспомогательные сервисы (core/)

| Сервис | Назначение |
|--------|------------|
| `ShelfLifeCalculator` | Расчёт срока годности по условиям |
| `StoragePresetProvider` | Коэффициенты по категориям |
| `DefaultsProvider` | Дефолты (срок, цена) по категориям |
| `FifoSelector` | Выбор партий для списания по FIFO |
| `AutoDiscountCalculator` | Расчёт скидки по сроку |

---

## 4. Процессы (Orchestrators)

> **Кратко:** Сложные операции, которые затрагивают несколько сущностей. Работают в транзакции.

### 4.1 InventoryOrchestrator

Главный координатор. Все операции идут через него.

```typescript
// src/processes/inventory/inventory.orchestrator.ts

class InventoryOrchestrator {
  
  // Приёмка товара
  async receive(input: ReceiveInput): Promise<ReceiveResult> {
    // 1. Создать/найти Batch
    // 2. Создать/обновить BatchLocation
    // 3. Пересчитать StorefrontProduct.stock
    // 4. Записать Movement
  }
  
  // Продажа (офлайн)
  async sellOffline(input: SellOfflineInput): Promise<void> {
    // 1. Выбрать партии по FIFO
    // 2. Проверить конфликт с резервом
    // 3. Списать из BatchLocation
    // 4. Пересчитать StorefrontProduct.stock
    // 5. Если затронут резерв → уведомление
    // 6. Записать Movement
  }
  
  // Создание резерва (для онлайн-заказа)
  async createReservation(input: ReserveInput): Promise<Reservation> {
    // 1. Выбрать партии по FIFO
    // 2. Увеличить reserved в BatchLocation
    // 3. Создать Reservation
    // 4. Пересчитать StorefrontProduct.stock.available
  }
  
  // Подтверждение резерва (заказ собран)
  async confirmReservation(reservationId: string): Promise<void> {
    // 1. Списать из BatchLocation
    // 2. Пересчитать StorefrontProduct.stock
    // 3. Обновить Reservation.status
    // 4. Записать Movement
  }
  
  // Отмена резерва
  async releaseReservation(reservationId: string): Promise<void> {
    // 1. Уменьшить reserved в BatchLocation
    // 2. Удалить Reservation
    // 3. Пересчитать StorefrontProduct.stock.available
  }
}
```

### 4.2 Какие процессы нужны

| Процесс | Триггер | Что делает |
|---------|---------|------------|
| **Приёмка** | Продавец нажал "+ Приход" | Создаёт Batch + BatchLocation |
| **Продажа онлайн** | Заказ создан → собран → отгружен | Резерв → списание |
| **Продажа офлайн** | Сотрудник продал | Списание по FIFO |
| **Списание** | Продавец списал порчу | Уменьшает BatchLocation |
| **Перемещение** | Товар со склада в магазин | Меняет location, пересчитывает срок |
| **Инвентаризация** | Сверка факта | Корректирует BatchLocation |
| **Возврат** | Курьер вернул заказ | Возвращает в остаток (или списывает) |
| **Алерты** | Cron (ежедневно) | Проверяет сроки, шлёт уведомления |
| **Автоскидки** | Cron или при изменении остатка | Обновляет StorefrontProduct.autoDiscount |

---

## 5. Правила и инварианты

> **Кратко:** Что система должна гарантировать ВСЕГДА.

### 5.1 Правила остатков

| Правило | Описание |
|---------|----------|
| **Остаток ≥ 0** | Нельзя уйти в минус |
| **Reserved ≤ Quantity** | Нельзя зарезервировать больше, чем есть |
| **Stock синхронизирован** | `StorefrontProduct.stock` = сумма `BatchLocation` |

### 5.2 Правила резервирования

| Правило | Описание |
|---------|----------|
| **Резерв по FIFO** | Резервируем сначала старые партии |
| **TTL резерва** | Если заказ не подтверждён за N минут → резерв снимается |
| **Офлайн важнее** | Физический покупатель может забрать зарезервированный товар |

### 5.3 Правила сроков

| Правило | Описание |
|---------|----------|
| **FIFO при списании** | Сначала списываем то, что истекает раньше |
| **Пересчёт при перемещении** | Если условия хранения изменились → срок пересчитывается |
| **Автоблокировка** | Истёкший товар скрывается с витрины |

### 5.4 Правила уровней

| Правило | Описание |
|---------|----------|
| **Партии всегда** | Даже в LITE бэкенд создаёт партии |
| **Консолидация в STANDARD** | Партии с одинаковым сроком объединяются для UI |
| **Данные не теряются** | При смене уровня данные сохраняются |

---

## 6. Интеграция с другими модулями

> **Кратко:** Какие модули используют склад и как.

### 6.1 Входящие зависимости (кто использует нас)

| Модуль | Как использует |
|--------|----------------|
| **Order** | Резервирование при создании заказа |
| **Shop** | Получение остатков для витрины |
| **Cart** | Проверка доступности товара |
| **Finance** | Закупочная цена для расчёта маржи |

### 6.2 Исходящие зависимости (кого используем мы)

| Модуль | Зачем |
|--------|-------|
| **Shop** | Получить shopId для локации |
| **Seller** | Проверить уровень (LITE/STANDARD/PRO) |
| **Notification** | Отправить алерт продавцу |
| **Images** | Хранение фото товаров |

### 6.3 События (EventEmitter)

**Публикуем:**
```typescript
// Когда остаток изменился
inventory.stock.changed: { locationId, productTemplateId, stock }

// Когда товар истекает
inventory.batch.expiring: { batchId, daysRemaining }

// Когда резерв затронут офлайн-продажей
inventory.reservation.affected: { reservationId, orderId, affectedQuantity }
```

**Слушаем:**
```typescript
// Когда заказ создан → создать резерв
order.created: { orderId, items }

// Когда заказ отменён → снять резерв
order.cancelled: { orderId }

// Когда заказ доставлен → подтвердить списание
order.delivered: { orderId }
```

---

## 7. Три уровня (LITE/STANDARD/PRO)

> **Кратко:** Уровень влияет на UI и автоматизацию, НЕ на структуру данных.

### 7.1 Где хранится уровень

```typescript
// В Seller
seller.inventoryTier: 'LITE' | 'STANDARD' | 'PRO'

// Или в Shop (если разные магазины на разных уровнях)
shop.inventoryTier: 'LITE' | 'STANDARD' | 'PRO'
```

### 7.2 Что меняется по уровням

| Аспект | LITE | STANDARD | PRO |
|--------|------|----------|-----|
| **Приёмка: ввод** | Только количество | + срок | + цена, поставщик |
| **Приёмка: авто** | Срок из справочника, цена последняя | Консолидация по срокам | Полный учёт |
| **Списание: выбор** | Авто (FIFO) | Можно выбрать слот | Можно выбрать партию |
| **UI: отображение** | Одна цифра | Слоты по срокам | Список партий |
| **Перемещения** | ❌ | ❌ | ✅ |
| **Пересчёт сроков** | ❌ | ❌ | ✅ (Premium) |
| **Инвентаризация** | Общая цифра | По слотам | По партиям |

### 7.3 Как реализовать в коде

```typescript
// В ReceivingService
async receive(cmd: ReceiveCommand) {
  const tier = await this.getTier(cmd.sellerId);
  
  // Определяем срок
  const expirationDate = cmd.expirationDate 
    ?? await this.defaults.getShelfLife(cmd.productTemplateId);
  
  // Определяем цену
  const price = cmd.purchasePrice 
    ?? await this.getLastPurchasePrice(cmd.productTemplateId);
  
  // В STANDARD: ищем партию с таким же сроком
  if (tier === 'STANDARD') {
    const existing = await this.findBatchByExpiration(
      cmd.locationId, 
      cmd.productTemplateId, 
      expirationDate
    );
    if (existing) {
      return this.addToBatch(existing, cmd.quantity);
    }
  }
  
  // Создаём новую партию
  return this.createBatch({ ...cmd, expirationDate, price });
}
```

### 7.4 Агрегация для UI

```typescript
// Для LITE: одна цифра
async getStockLite(locationId, productTemplateId): Promise<number> {
  return this.batchLocationRepo.aggregate([
    { $match: { locationId, productTemplateId } },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]);
}

// Для STANDARD: группировка по срокам
async getStockStandard(locationId, productTemplateId): Promise<Slot[]> {
  return this.batchLocationRepo.aggregate([
    { $match: { locationId, productTemplateId } },
    { $lookup: { from: 'batches', ... } },
    { $group: { 
      _id: '$batch.expirationDate', 
      quantity: { $sum: '$quantity' } 
    }},
    { $sort: { _id: 1 } }
  ]);
}

// Для PRO: полный список партий
async getStockPro(locationId, productTemplateId): Promise<BatchInfo[]> {
  return this.batchLocationRepo.find({ locationId, productTemplateId })
    .populate('batchId');
}
```

---

## 8. Миграция в микросервис

> **Кратко:** Что сделать заранее, чтобы потом легко выделить в отдельный сервис.

### 8.1 Принципы изоляции

| Принцип | Как соблюдаем |
|---------|---------------|
| **Весь доступ через порт** | Никаких прямых импортов схем |
| **События вместо синхронных вызовов** | Order не вызывает Inventory напрямую |
| **Свои ID** | `batchId`, а не `ObjectId` напрямую |
| **Нет join-ов наружу** | Не $lookup на Order/Customer |

### 8.2 Что нужно для микросервиса

1. **Отдельная база** — все коллекции inventory в отдельной MongoDB
2. **API Gateway** — HTTP/gRPC эндпоинты вместо прямых вызовов
3. **Event Bus** — Kafka/RabbitMQ вместо EventEmitter
4. **Saga для заказов** — координация Order ↔ Inventory через события

### 8.3 Структура при выделении

```
fruktgo-inventory-service/
├── src/
│   ├── modules/inventory/     # Копируем как есть
│   ├── interface/
│   │   ├── http/              # REST API
│   │   └── grpc/              # gRPC (опционально)
│   └── events/
│       ├── publishers/        # Публикация событий
│       └── consumers/         # Подписка на события
└── docker-compose.yml
```

---

## 9. Чек-лист перед реализацией

- [ ] Создать схемы всех сущностей
- [ ] Настроить индексы (особенно для FIFO-запросов)
- [ ] Реализовать core/ сервисы (расчёты без базы)
- [ ] Реализовать базовые порты (CRUD)
- [ ] Реализовать InventoryOrchestrator
- [ ] Добавить события
- [ ] Интегрировать с Order (резервирование)
- [ ] Реализовать автоскидки
- [ ] Реализовать алерты
- [ ] Покрыть тестами критичные пути

---

## 10. Глоссарий

| Термин | Описание |
|--------|----------|
| **ProductTemplate** | Карточка товара без остатков |
| **Batch** | Партия — конкретная поставка с датой и ценой |
| **BatchLocation** | Сколько партии лежит в локации |
| **StorefrontProduct** | Товар на витрине с ценой и агрегированным остатком |
| **Reservation** | Резерв под онлайн-заказ |
| **FIFO** | First In First Out — продаём старое первым |
| **Slot** | Группа партий с одинаковым сроком (для STANDARD UI) |
| **Tier** | Уровень: LITE / STANDARD / PRO |
