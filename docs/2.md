# New Inventory System - План реализации v2

> **Цель:** Реализовать систему складского учёта согласно `docs/inventory-system-overview.md` с нуля внутри `src/modules/new-inventory/`, с последующей интеграцией в основную систему.

---

## Анализ проблем текущей реализации

### Критические проблемы

| # | Проблема | Текущее состояние | Целевое состояние |
|---|----------|-------------------|-------------------|
| 1 | **Product без условий хранения** | Нет температуры, влажности, пресетов | Полные условия хранения + пресеты коэффициентов |
| 2 | **Статический срок годности** | Только `expirationDate` от поставщика | Динамический `effectiveExpirationDate` + `freshnessRemaining` |
| 3 | **Receiving не создаёт партии** | Работает с `ShopProduct` напрямую | Создаёт `Batch` + `BatchLocation` |
| 4 | **Transfer не работает с партиями** | Перемещает товары, не партии | FEFO выбор партий + пересчёт сроков |
| 5 | **StockMovement без Warehouse** | Только для Shop | Универсальный для любых локаций |
| 6 | **BatchStock не интегрирован** | Модуль есть, но не используется | Полная интеграция во все операции |
| 7 | **Дублирование остатков** | `ShopProduct.stockQuantity` vs `BatchStock` | Единый источник (агрегация из BatchLocation) |
| 8 | **Нет модуля Return** | Отсутствует | Полный цикл возвратов с оценкой состояния |
| 9 | **Нет ShelfLifeCalculator** | Отсутствует | Сервис расчёта динамических сроков |
| 10 | **Warehouse без условий** | Нет температуры/влажности | Условия для расчёта коэффициентов |
| 11 | **Нет смешивания партий** | Партии строго раздельны | Поддержка MixedBatch при физическом смешении |
| 12 | **Цена глобальная в Product** | Одна цена на все магазины | Цены на уровне витрины (онлайн/офлайн/скидки) |
| 13 | **Shop смешан с витриной** | Всё в одной сущности | Разделение Shop (бизнес) и Storefront (витрина) |
| 14 | **Нет типов товаров** | Все товары одинаковые | ProductType: PERISHABLE, SHELF_STABLE, BAKERY, MEAT... |
| 15 | **Нет собственного производства** | Только закупаемые товары | isHomemade + рецепты, ингредиенты, время приготовления |
| 16 | **Управление свежестью для всех** | Всегда динамический срок | freshnessManagementEnabled как опция (💎 Premium) |
| 17 | **Нет категорийных расширений** | Одинаковые поля для всех | BakeryExtensions, MeatExtensions, SeafoodExtensions... |

---

## Архитектура новой системы

### Структура папки `new-inventory/`

```
src/modules/new-inventory/
│
├── index.ts                        # Barrel exports всего модуля
├── new-inventory.module.ts         # Главный NestJS модуль
├── IMPLEMENTATION-PLAN.md          # Этот документ
│
├── core/                           # Ядро системы
│   ├── storage-preset/             # Пресеты коэффициентов (BERRIES, CITRUS...)
│   ├── storage-conditions/         # Условия хранения (температура, влажность)
│   └── shelf-life-calculator/      # Расчёт динамических сроков
│
├── entities/                       # Базовые сущности (расширение существующих)
│   ├── product-template/           # ProductTemplate (расширяет Product)
│   │   ├── product-template.schema.ts
│   │   ├── product-template.enums.ts
│   │   ├── product-template.port.ts
│   │   ├── product-template.service.ts
│   │   └── index.ts
│   │
│   ├── storage-location/           # StorageLocation (склад Shop или Warehouse)
│   │   ├── storage-location.schema.ts
│   │   ├── storage-location.enums.ts
│   │   ├── storage-location.port.ts
│   │   ├── storage-location.service.ts
│   │   └── index.ts
│   │
│   └── storefront/                 # Storefront (витрина магазина с ценами)
│       ├── storefront.schema.ts
│       ├── storefront-product.schema.ts  # Товар на витрине с ценами
│       ├── storefront.enums.ts
│       ├── storefront.port.ts
│       ├── storefront.service.ts
│       └── index.ts
│
├── batch/                          # Партии товара
│   ├── batch.schema.ts             # Партия с динамическим сроком
│   ├── mixed-batch.schema.ts       # Смешанная партия (несколько исходных)
│   ├── batch.enums.ts
│   ├── batch.commands.ts
│   ├── batch.queries.ts
│   ├── batch.port.ts
│   ├── batch.service.ts
│   ├── batch.module.ts
│   └── index.ts
│
├── batch-location/                 # Остатки партий в локациях
│   ├── batch-location.schema.ts
│   ├── batch-location.enums.ts
│   ├── batch-location.commands.ts
│   ├── batch-location.queries.ts
│   ├── batch-location.port.ts
│   ├── batch-location.service.ts
│   ├── batch-location.module.ts
│   └── index.ts
│
├── pricing/                        # Ценообразование
│   ├── pricing.schema.ts           # Цены витрины (онлайн/офлайн/скидки)
│   ├── pricing.enums.ts
│   ├── pricing.commands.ts
│   ├── pricing.queries.ts
│   ├── pricing.port.ts
│   ├── pricing.service.ts
│   ├── pricing.module.ts
│   └── index.ts
│
├── operations/                     # Операции
│   ├── receiving/                  # Приёмка
│   ├── transfer/                   # Перемещение
│   ├── write-off/                  # Списание
│   ├── return/                     # Возвраты
│   ├── audit/                      # Инвентаризация
│   └── mixing/                     # Смешивание партий
│
├── movement/                       # История движений
│   ├── movement.schema.ts
│   ├── movement.enums.ts
│   ├── movement.commands.ts
│   ├── movement.queries.ts
│   ├── movement.port.ts
│   ├── movement.service.ts
│   ├── movement.module.ts
│   └── index.ts
│
├── reservation/                    # Резервирование
│   ├── reservation.schema.ts
│   ├── reservation.enums.ts
│   ├── reservation.commands.ts
│   ├── reservation.queries.ts
│   ├── reservation.port.ts
│   ├── reservation.service.ts
│   ├── reservation.module.ts
│   └── index.ts
│
├── alerts/                         # Алерты по срокам
│   ├── expiration-alert.service.ts
│   └── index.ts
│
└── orchestrator/                   # Оркестратор
    ├── inventory.orchestrator.ts
    ├── inventory.orchestrator.types.ts
    └── index.ts
```

### Связи между модулями

```
                                    ┌─────────────────────┐
                                    │   ORCHESTRATOR      │
                                    │  (координация)      │
                                    └─────────┬───────────┘
                                              │
              ┌───────────────┬───────────────┼───────────────┬───────────────┐
              ▼               ▼               ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ RECEIVING│    │ TRANSFER │    │ WRITE-OFF│    │  RETURN  │    │  AUDIT   │
       └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
            │               │               │               │               │
            └───────────────┴───────────────┼───────────────┴───────────────┘
                                            │
                            ┌───────────────┴───────────────┐
                            ▼                               ▼
                     ┌──────────────┐               ┌──────────────┐
                     │    BATCH     │───────────────│BATCH-LOCATION│
                     │  (партия)    │               │  (остатки)   │
                     └──────┬───────┘               └──────┬───────┘
                            │                              │
                            ▼                              ▼
                     ┌──────────────┐               ┌──────────────┐
                     │   MOVEMENT   │               │ RESERVATION  │
                     │  (история)   │               │  (резервы)   │
                     └──────────────┘               └──────────────┘
                            │
                            ▼
                     ┌──────────────────────────────────────────────┐
                     │              CORE                            │
                     │  ShelfLifeCalculator + StoragePresets        │
                     └──────────────────────────────────────────────┘
```

---

## Новые концепции

### 1. Разделение Shop и Storefront

**Проблема:** Сейчас `Shop` содержит всё — и бизнес-логику (сотрудники, смены, финансы), и витрину (товары, цены, остатки).

**Решение:** Разделить на:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHOP (бизнес-сущность)                        │
│  • Владелец (Seller)           • Сотрудники (Employee)                  │
│  • Смены (Shift)               • Финансы (ShopAccount)                  │
│  • Верификация                 • Настройки заказов                       │
│  • График работы               • Адрес/контакты                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
         ┌─────────────────────┐         ┌─────────────────────┐
         │    STOREFRONT       │         │  STORAGE LOCATION   │
         │   (витрина)         │         │  (складская часть)  │
         ├─────────────────────┤         ├─────────────────────┤
         │ • StorefrontProduct │         │ • Температура       │
         │ • Цены онлайн       │         │ • Влажность         │
         │ • Цены офлайн       │         │ • Коэффициент       │
         │ • Скидки            │         │ • BatchLocation     │
         │ • Видимость         │         │ • Остатки           │
         └─────────────────────┘         └─────────────────────┘
```

**Принцип:** Shop ссылается на свой Storefront и StorageLocation. Warehouse имеет только StorageLocation (нет витрины).

### 2. Модель ценообразования (Pricing)

**Проблема:** Сейчас цена в `Product.price` — глобальная для всех магазинов.

**Решение:** Цены на уровне витрины с поддержкой:

```typescript
// ═══════════════════════════════════════════════════════════════
// ЖИВЫЕ ФОТОГРАФИИ С ВИТРИНЫ
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class LivePhoto {
  /** Ссылка на изображение */
  @Prop({ type: Types.ObjectId, ref: 'Image', required: true })
  image: Types.ObjectId;

  /** Дата съёмки */
  @Prop({ type: Date, required: true })
  takenAt: Date;

  /** Кто сделал фото */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  takenBy: Types.ObjectId;

  /** Описание (опционально) */
  @Prop({ type: String })
  caption?: string;

  /** Активно ли фото (показывается клиентам) */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /** Порядок отображения */
  @Prop({ type: Number, default: 0 })
  order: number;
}

// StorefrontProduct — товар на витрине конкретного магазина
@Schema({ _id: false })
export class StorefrontProduct {
  /** Ссылка на ProductTemplate */
  @Prop({ type: Types.ObjectId, ref: 'ProductTemplate', required: true })
  product: Types.ObjectId;

  /** Видимость на витрине */
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  /** Ценообразование */
  @Prop({ type: ProductPricingSchema, required: true })
  pricing: ProductPricing;

  // ═══════════════════════════════════════════════════════════════
  // 📸 ЖИВЫЕ ФОТОГРАФИИ
  // ═══════════════════════════════════════════════════════════════
  // Актуальные фотографии товара с прилавка/витрины:
  // - Делаются регулярно (ежедневно или при новых поступлениях)
  // - Показывают реальное состояние товара
  // - Повышают доверие клиента к качеству продукции
  // - Указывается дата съёмки

  /** Живые фотографии с витрины */
  @Prop({ type: [LivePhotoSchema], default: [] })
  livePhotos: LivePhoto[];

  /** Дата последнего обновления фотографий */
  @Prop({ type: Date })
  photosLastUpdatedAt?: Date;

  /** Напоминание об обновлении фото (например, раз в день) */
  @Prop({ type: Boolean, default: false })
  needsPhotoUpdate: boolean;

  /** Статистика продаж */
  @Prop({ type: StorefrontProductStatsSchema })
  statistics?: StorefrontProductStats;
}

// ProductPricing — вложенная схема цен
@Schema({ _id: false })
export class ProductPricing {
  /** Закупочная цена (из последней партии или средняя) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** Рекомендованная розничная цена (из ProductTemplate) */
  @Prop({ type: Number, min: 0 })
  recommendedRetailPrice?: number;

  /** Цена для онлайн-заказов */
  @Prop({ type: Number, min: 0, required: true })
  onlinePrice: number;

  /** Цена для офлайн-продаж (если отличается) */
  @Prop({ type: Number, min: 0 })
  offlinePrice?: number;

  /** Оптовая цена (от N единиц) */
  @Prop({ type: WholesalePricingSchema })
  wholesale?: WholesalePricing;

  /** Активная скидка */
  @Prop({ type: DiscountSchema })
  discount?: Discount;

  /** Маржинальность (рассчитывается) */
  readonly margin?: number; // (onlinePrice - purchasePrice) / onlinePrice
}

// WholesalePricing — оптовые цены
@Schema({ _id: false })
export class WholesalePricing {
  /** Минимальное количество для оптовой цены */
  @Prop({ type: Number, min: 1, required: true })
  minQuantity: number;

  /** Оптовая цена за единицу */
  @Prop({ type: Number, min: 0, required: true })
  price: number;
}

// Discount — скидка на товар
@Schema({ _id: false })
export class Discount {
  /** Тип скидки */
  @Prop({ type: String, enum: ['PERCENT', 'FIXED'], required: true })
  type: 'PERCENT' | 'FIXED';

  /** Значение (% или фиксированная сумма) */
  @Prop({ type: Number, min: 0, required: true })
  value: number;

  /** Причина скидки */
  @Prop({ type: String, enum: Object.values(DiscountReason) })
  reason?: DiscountReason;

  /** Период действия */
  @Prop({ type: Date })
  startsAt?: Date;

  @Prop({ type: Date })
  endsAt?: Date;

  /** Связанные партии (для скидок по сроку) */
  @Prop({ type: [Types.ObjectId], ref: 'Batch' })
  batches?: Types.ObjectId[];
}

// Причины скидок
export enum DiscountReason {
  EXPIRING_SOON = 'EXPIRING_SOON',     // Скоро истекает
  RETURNED_ITEM = 'RETURNED_ITEM',     // Возврат
  PROMOTION = 'PROMOTION',             // Акция
  CLEARANCE = 'CLEARANCE',             // Распродажа
  DAMAGED = 'DAMAGED',                 // Повреждённая упаковка
  LOYALTY = 'LOYALTY',                 // Программа лояльности
  MANUAL = 'MANUAL',                   // Ручная скидка
}
```

**Логика расчёта цены при продаже:**

```typescript
function calculateFinalPrice(product: StorefrontProduct, quantity: number, channel: 'online' | 'offline'): number {
  const pricing = product.pricing;
  
  // 1. Базовая цена по каналу
  let basePrice = channel === 'online' 
    ? pricing.onlinePrice 
    : (pricing.offlinePrice ?? pricing.onlinePrice);
  
  // 2. Проверка оптовой цены
  if (pricing.wholesale && quantity >= pricing.wholesale.minQuantity) {
    basePrice = pricing.wholesale.price;
  }
  
  // 3. Применение скидки
  if (pricing.discount && isDiscountActive(pricing.discount)) {
    if (pricing.discount.type === 'PERCENT') {
      basePrice = basePrice * (1 - pricing.discount.value / 100);
    } else {
      basePrice = Math.max(0, basePrice - pricing.discount.value);
    }
  }
  
  return basePrice * quantity;
}
```

### 3. Смешивание партий (Batch Mixing)

**Проблема:** В реальности товар из разных партий может физически смешиваться (например, высыпается в один ящик).

**Решение:** Концепция `MixedBatch`:

```typescript
// MixedBatch — смешанная партия из нескольких исходных
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class MixedBatch {
  _id: Types.ObjectId;
  createdAt: Date;

  /** Владелец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  /** Товар */
  @Prop({ type: Types.ObjectId, ref: 'ProductTemplate', required: true })
  product: Types.ObjectId;

  /** Номер смешанной партии (генерируется: MIX-YYYYMMDD-XXX) */
  @Prop({ type: String, required: true, unique: true })
  mixedBatchNumber: string;

  /** Исходные партии и их доли */
  @Prop({ type: [MixedBatchSourceSchema], required: true })
  sources: MixedBatchSource[];

  /** Общее количество */
  @Prop({ type: Number, min: 0, required: true })
  totalQuantity: number;

  /** Эффективный срок годности (минимальный из источников) */
  @Prop({ type: Date, required: true })
  effectiveExpirationDate: Date;

  /** Средневзвешенная свежесть */
  @Prop({ type: Number, required: true })
  weightedFreshnessRemaining: number;

  /** Средневзвешенная закупочная цена */
  @Prop({ type: Number, min: 0 })
  weightedPurchasePrice?: number;

  /** Причина смешивания */
  @Prop({ type: String, enum: Object.values(MixingReason), required: true })
  reason: MixingReason;

  /** Локация, где произошло смешивание */
  @Prop({ type: Types.ObjectId, ref: 'StorageLocation', required: true })
  location: Types.ObjectId;

  /** Статус */
  @Prop({ type: String, enum: Object.values(BatchStatus), default: BatchStatus.ACTIVE })
  status: BatchStatus;
}

// MixedBatchSource — исходная партия в смеси
@Schema({ _id: false })
export class MixedBatchSource {
  /** Исходная партия (Batch или MixedBatch) */
  @Prop({ type: Types.ObjectId, required: true })
  sourceBatch: Types.ObjectId;

  /** Тип источника */
  @Prop({ type: String, enum: ['BATCH', 'MIXED_BATCH'], required: true })
  sourceType: 'BATCH' | 'MIXED_BATCH';

  /** Количество из этой партии */
  @Prop({ type: Number, min: 0, required: true })
  quantity: number;

  /** Срок годности источника на момент смешивания */
  @Prop({ type: Date, required: true })
  expirationDateAtMix: Date;

  /** Свежесть источника на момент смешивания */
  @Prop({ type: Number, required: true })
  freshnessAtMix: number;

  /** Закупочная цена источника */
  @Prop({ type: Number, min: 0 })
  purchasePriceAtMix?: number;
}

// Причины смешивания
export enum MixingReason {
  PHYSICAL_MIX = 'PHYSICAL_MIX',           // Физическое смешивание (в одном ящике)
  CONSOLIDATION = 'CONSOLIDATION',         // Консолидация мелких остатков
  REPACKING = 'REPACKING',                 // Перефасовка
  QUALITY_MERGE = 'QUALITY_MERGE',         // Объединение по качеству
}
```

**Workflow смешивания:**

```
Операция: MIXING

1. Выбор исходных партий одного товара в одной локации
2. Указание количества от каждой партии
3. Подтверждение → создание MixedBatch:
   - effectiveExpirationDate = MIN(источники.expirationDate)
   - weightedFreshnessRemaining = Σ(freshness_i × qty_i) / Σ(qty_i)
   - weightedPurchasePrice = Σ(price_i × qty_i) / Σ(qty_i)
4. Уменьшение quantity в исходных BatchLocation
5. Создание BatchLocation для MixedBatch
6. Запись Movement с type=MIXING
```

**Пример:**

```
Смешивание клубники:
├── Партия A: 3 кг, срок до 10.12, свежесть 5.0, цена 300₽/кг
├── Партия B: 2 кг, срок до 12.12, свежесть 7.0, цена 280₽/кг
│
▼ MixedBatch:
├── Количество: 5 кг
├── Срок: до 10.12 (минимальный)
├── Свежесть: (5.0×3 + 7.0×2) / 5 = 5.8 условных дней
└── Цена: (300×3 + 280×2) / 5 = 292₽/кг
```

### 4. ProductTemplate (расширение Product)

**Проблема:** Текущий `Product` не содержит условий хранения, типов товаров, собственного производства и категорийных расширений.

**Решение:** Создать `ProductTemplate` в new-inventory:

```typescript
// ═══════════════════════════════════════════════════════════════
// ТИПЫ ТОВАРОВ И КАТЕГОРИИ (Тип → определяет доступные категории)
// ═══════════════════════════════════════════════════════════════

export enum ProductType {
  PERISHABLE = 'PERISHABLE',       // Скоропорт (фрукты, овощи, ягоды, зелень, молочка)
  SHELF_STABLE = 'SHELF_STABLE',   // Длительного хранения (консервы, крупы, мёд)
  FROZEN = 'FROZEN',               // Замороженные
  BAKERY = 'BAKERY',               // Выпечка
  MEAT = 'MEAT',                   // Мясо/птица
  SEAFOOD = 'SEAFOOD',             // Рыба/морепродукты
  DAIRY = 'DAIRY',                 // Молочные продукты
  BEVERAGES = 'BEVERAGES',         // Напитки
  NON_FOOD = 'NON_FOOD',           // Непищевые товары
}

// Категории зависят от типа товара
export const PRODUCT_TYPE_CATEGORIES: Record<ProductType, string[]> = {
  [ProductType.PERISHABLE]: [
    'FRUITS',           // Фрукты
    'VEGETABLES',       // Овощи
    'BERRIES',          // Ягоды
    'GREENS',           // Зелень
    'MUSHROOMS',        // Грибы
    'EGGS',             // Яйца
  ],
  [ProductType.SHELF_STABLE]: [
    'CANNED',           // Консервы
    'CEREALS',          // Крупы
    'PASTA',            // Макароны
    'HONEY',            // Мёд
    'NUTS',             // Орехи
    'DRIED_FRUITS',     // Сухофрукты
    'OILS',             // Масла
    'SAUCES',           // Соусы
    'SPICES',           // Специи
  ],
  [ProductType.FROZEN]: [
    'FROZEN_VEGETABLES',  // Замороженные овощи
    'FROZEN_FRUITS',      // Замороженные фрукты
    'FROZEN_BERRIES',     // Замороженные ягоды
    'ICE_CREAM',          // Мороженое
    'SEMI_FINISHED',      // Полуфабрикаты
  ],
  [ProductType.BAKERY]: [
    'BREAD',            // Хлеб
    'PASTRY',           // Выпечка
    'CAKES',            // Торты
    'COOKIES',          // Печенье
  ],
  [ProductType.MEAT]: [
    'BEEF',             // Говядина
    'PORK',             // Свинина
    'LAMB',             // Баранина
    'CHICKEN',          // Курица
    'TURKEY',           // Индейка
    'OFFAL',            // Субпродукты
  ],
  [ProductType.SEAFOOD]: [
    'FISH',             // Рыба
    'SHELLFISH',        // Моллюски
    'CRUSTACEAN',       // Ракообразные
  ],
  [ProductType.DAIRY]: [
    'MILK',             // Молоко
    'CHEESE',           // Сыры
    'YOGURT',           // Йогурты
    'BUTTER',           // Масло
    'CREAM',            // Сливки
  ],
  [ProductType.BEVERAGES]: [
    'JUICES',           // Соки
    'WATER',            // Вода
    'SOFT_DRINKS',      // Газировки
    'FRESH_JUICES',     // Свежевыжатые соки
  ],
  [ProductType.NON_FOOD]: [
    'PACKAGING',        // Упаковка
    'TABLEWARE',        // Посуда
    'ACCESSORIES',      // Аксессуары
  ],
};

// ═══════════════════════════════════════════════════════════════
// ЕДИНИЦЫ ИЗМЕРЕНИЯ (с литрами)
// ═══════════════════════════════════════════════════════════════

export enum MeasuringScale {
  PIECE = 'PIECE',           // Штуки
  KILOGRAM = 'KILOGRAM',     // Килограммы
  GRAM = 'GRAM',             // Граммы
  LITER = 'LITER',           // Литры
  MILLILITER = 'MILLILITER', // Миллилитры
}

// ═══════════════════════════════════════════════════════════════
// КБЖУ (Калории, Белки, Жиры, Углеводы)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class NutritionInfo {
  /** Калории на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  calories?: number;

  /** Белки на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  proteins?: number;

  /** Жиры на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  fats?: number;

  /** Углеводы на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  carbohydrates?: number;

  /** Клетчатка на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  fiber?: number;

  /** Сахар на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  sugar?: number;

  /** Соль на 100г/100мл */
  @Prop({ type: Number, min: 0 })
  salt?: number;
}

// ═══════════════════════════════════════════════════════════════
// СОБСТВЕННОЕ ПРОИЗВОДСТВО (Homemade)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class HomemadeDetails {
  /** Рецепт / описание приготовления */
  @Prop({ type: String })
  recipe?: string;

  /** Состав из других товаров */
  @Prop({ type: [HomemadeIngredientSchema] })
  ingredients?: HomemadeIngredient[];

  /** Время приготовления (минуты) */
  @Prop({ type: Number, min: 0 })
  preparationTime?: number;

  /** Срок годности после приготовления (часы) */
  @Prop({ type: Number, min: 0 })
  shelfLifeAfterPreparationHours?: number;

  /** Требуется предзаказ? */
  @Prop({ type: Boolean, default: false })
  requiresPreOrder: boolean;

  /** Минимальное количество для заказа */
  @Prop({ type: Number, min: 1, default: 1 })
  minOrderQuantity: number;

  /** Можно готовить заранее (и хранить)? */
  @Prop({ type: Boolean, default: false })
  canBePreparedInAdvance: boolean;

  /** Максимум штук в день (ограничение производства) */
  @Prop({ type: Number })
  maxDailyProduction?: number;
}

@Schema({ _id: false })
export class HomemadeIngredient {
  /** Ссылка на ProductTemplate ингредиента */
  @Prop({ type: Types.ObjectId, ref: 'ProductTemplate', required: true })
  product: Types.ObjectId;

  /** Количество ингредиента на 1 единицу готового товара */
  @Prop({ type: Number, min: 0, required: true })
  quantity: number;

  /** Единица измерения (может отличаться от основной) */
  @Prop({ type: String })
  unit?: string;
}

// ═══════════════════════════════════════════════════════════════
// КАТЕГОРИЙНЫЕ РАСШИРЕНИЯ
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class BakeryExtensions {
  /** Тип теста */
  @Prop({ type: String, enum: ['YEAST', 'PUFF', 'SHORTCRUST', 'CHOUX', 'BISCUIT', 'OTHER'] })
  doughType?: string;

  /** Начинка */
  @Prop({ type: String })
  filling?: string;

  /** Украшения/топпинги */
  @Prop({ type: [String] })
  toppings?: string[];

  /** Аллергены */
  @Prop({ type: [String] })
  allergens?: string[];

  /** Без глютена */
  @Prop({ type: Boolean, default: false })
  isGlutenFree: boolean;

  /** Веганский */
  @Prop({ type: Boolean, default: false })
  isVegan: boolean;

  /** Калорийность на 100г */
  @Prop({ type: Number })
  caloriesPer100g?: number;

  /** Вес изделия (граммы) */
  @Prop({ type: Number })
  weightGrams?: number;
}

@Schema({ _id: false })
export class MeatExtensions {
  /** Тип мяса */
  @Prop({ type: String, enum: ['BEEF', 'PORK', 'LAMB', 'CHICKEN', 'TURKEY', 'DUCK', 'RABBIT', 'OTHER'] })
  meatType?: string;

  /** Часть туши */
  @Prop({ type: String })
  cut?: string;

  /** Жирность % */
  @Prop({ type: Number, min: 0, max: 100 })
  fatContent?: number;

  /** Состояние хранения */
  @Prop({ type: String, enum: ['CHILLED', 'FROZEN'] })
  storageState?: string;

  /** Страна происхождения */
  @Prop({ type: String })
  origin?: string;

  /** Халяль */
  @Prop({ type: Boolean, default: false })
  halal: boolean;

  /** Кошер */
  @Prop({ type: Boolean, default: false })
  kosher: boolean;
}

@Schema({ _id: false })
export class SeafoodExtensions {
  /** Тип морепродукта */
  @Prop({ type: String, enum: ['FISH', 'SHELLFISH', 'CRUSTACEAN', 'MOLLUSK', 'OTHER'] })
  seafoodType?: string;

  /** Вид */
  @Prop({ type: String })
  species?: string;

  /** Способ добычи */
  @Prop({ type: String, enum: ['WILD', 'FARMED'] })
  catchMethod?: string;

  /** Регион вылова */
  @Prop({ type: String })
  catchRegion?: string;

  /** Состояние */
  @Prop({ type: String, enum: ['FRESH', 'CHILLED', 'FROZEN'] })
  storageState?: string;

  /** Очищено */
  @Prop({ type: Boolean, default: false })
  cleaned: boolean;

  /** Без костей */
  @Prop({ type: Boolean, default: false })
  boneless: boolean;
}

@Schema({ _id: false })
export class DairyExtensions {
  /** Жирность % */
  @Prop({ type: Number, min: 0, max: 100 })
  fatContent?: number;

  /** Без лактозы */
  @Prop({ type: Boolean, default: false })
  lactoseFree: boolean;

  /** Пастеризованное */
  @Prop({ type: Boolean, default: true })
  pasteurized: boolean;

  /** Тип молока */
  @Prop({ type: String, enum: ['COW', 'GOAT', 'SHEEP', 'PLANT_BASED', 'OTHER'] })
  milkType?: string;
}

@Schema({ _id: false })
export class CategoryExtensions {
  /** Расширения для выпечки */
  @Prop({ type: BakeryExtensionsSchema })
  bakery?: BakeryExtensions;

  /** Расширения для мяса */
  @Prop({ type: MeatExtensionsSchema })
  meat?: MeatExtensions;

  /** Расширения для морепродуктов */
  @Prop({ type: SeafoodExtensionsSchema })
  seafood?: SeafoodExtensions;

  /** Расширения для молочных */
  @Prop({ type: DairyExtensionsSchema })
  dairy?: DairyExtensions;

  /** Произвольные пользовательские атрибуты */
  @Prop({ type: Map, of: Schema.Types.Mixed })
  customAttributes?: Map<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// ProductTemplate — ОСНОВНАЯ СХЕМА
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ProductTemplate {
  _id: Types.ObjectId;
  
  /** Ссылка на оригинальный Product (для обратной совместимости) */
  @Prop({ type: Types.ObjectId, ref: 'Product', index: true })
  legacyProduct?: Types.ObjectId;

  /** Владелец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ОСНОВНАЯ ИНФОРМАЦИЯ
  // ═══════════════════════════════════════════════════════════════
  
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, index: true })
  sku?: string;

  @Prop({ type: String, enum: Object.values(ProductCategory), required: true })
  category: ProductCategory;

  /** Тип товара (скоропорт, консервы, выпечка, мясо и т.д.) */
  @Prop({ type: String, enum: Object.values(ProductType), required: true })
  productType: ProductType;

  @Prop({ type: String, enum: Object.values(MeasuringScale), required: true })
  measuringScale: MeasuringScale;

  @Prop({ type: String, enum: Object.values(StepRate), required: true })
  stepRate: StepRate;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  origin?: string;

  @Prop({ type: Types.ObjectId, ref: 'Image' })
  image?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // КБЖУ (Пищевая ценность)
  // ═══════════════════════════════════════════════════════════════

  /** Пищевая ценность на 100г/100мл */
  @Prop({ type: NutritionInfoSchema })
  nutrition?: NutritionInfo;

  // ═══════════════════════════════════════════════════════════════
  // СОБСТВЕННОЕ ПРОИЗВОДСТВО
  // ═══════════════════════════════════════════════════════════════

  /** Товар собственного производства? */
  @Prop({ type: Boolean, default: false })
  isHomemade: boolean;

  /** Детали собственного производства (если isHomemade = true) */
  @Prop({ type: HomemadeDetailsSchema })
  homemadeDetails?: HomemadeDetails;

  // ═══════════════════════════════════════════════════════════════
  // УПРАВЛЕНИЕ СВЕЖЕСТЬЮ (💎 Premium Feature)
  // ═══════════════════════════════════════════════════════════════

  /** 
   * Включено ли управление свежестью для этого товара?
   * Если false — используется только статический срок годности
   * Это платная функция, зависит от подписки Seller
   */
  @Prop({ type: Boolean, default: false })
  freshnessManagementEnabled: boolean;

  /** Условия хранения (используются если freshnessManagementEnabled = true) */
  @Prop({ type: StorageConditionsSchema })
  storageConditions?: StorageConditions;

  // ═══════════════════════════════════════════════════════════════
  // БАЗОВЫЙ СРОК ГОДНОСТИ (для товаров без управления свежестью)
  // ═══════════════════════════════════════════════════════════════

  /** Статический срок годности в днях (для SHELF_STABLE и т.д.) */
  @Prop({ type: Number, min: 0 })
  defaultShelfLifeDays?: number;

  // ═══════════════════════════════════════════════════════════════
  // КАТЕГОРИЙНЫЕ РАСШИРЕНИЯ
  // ═══════════════════════════════════════════════════════════════

  /** Расширенные поля для конкретных категорий */
  @Prop({ type: CategoryExtensionsSchema })
  categoryExtensions?: CategoryExtensions;

  // ═══════════════════════════════════════════════════════════════
  // РЕКОМЕНДОВАННЫЕ ЦЕНЫ
  // ═══════════════════════════════════════════════════════════════
  
  /** Рекомендованная розничная цена (справочная) */
  @Prop({ type: Number, min: 0 })
  recommendedRetailPrice?: number;

  /** Целевая маржинальность % */
  @Prop({ type: Number, min: 0, max: 100 })
  targetMarginPercent?: number;

  // ═══════════════════════════════════════════════════════════════
  // ОГРАНИЧЕНИЯ ВОЗВРАТА
  // ═══════════════════════════════════════════════════════════════

  /** Разрешён ли возврат */
  @Prop({ type: Boolean, default: true })
  returnable: boolean;

  /** Максимальное время вне контроля для возврата (минуты) */
  @Prop({ type: Number })
  maxReturnMinutesOutOfControl?: number;

  // ═══════════════════════════════════════════════════════════════
  // ДЛЯ БУДУЩИХ РАСШИРЕНИЙ
  // ═══════════════════════════════════════════════════════════════

  /** Штрих-коды товара */
  @Prop({ type: [String] })
  barcodes?: string[];

  /** Теги для поиска и группировки */
  @Prop({ type: [String] })
  tags?: string[];

  /** Сезонность (месяцы, когда товар актуален) */
  @Prop({ type: [Number], min: 1, max: 12 })
  seasonalMonths?: number[];

  /** Минимальный остаток для автозаказа */
  @Prop({ type: Number, min: 0 })
  reorderPoint?: number;

  /** Рекомендуемое количество для заказа */
  @Prop({ type: Number, min: 0 })
  reorderQuantity?: number;

  /** Поставщик по умолчанию */
  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  defaultSupplier?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ProductTemplateStatus), default: ProductTemplateStatus.ACTIVE })
  status: ProductTemplateStatus;
}
```

### 4.1 Логика управления свежестью

```typescript
// Проверка, нужен ли динамический расчёт срока
function shouldUseDynamicShelfLife(
  product: ProductTemplate, 
  seller: Seller
): boolean {
  // 1. Продавец должен иметь подписку на функцию
  if (!seller.features?.freshnessManagement) {
    return false;
  }
  
  // 2. Для товара должно быть включено управление свежестью
  if (!product.freshnessManagementEnabled) {
    return false;
  }
  
  // 3. Должны быть заданы условия хранения
  if (!product.storageConditions) {
    return false;
  }
  
  // 4. Тип товара должен поддерживать динамику
  const dynamicTypes = [
    ProductType.PERISHABLE,
    ProductType.BAKERY,
    ProductType.MEAT,
    ProductType.SEAFOOD,
    ProductType.DAIRY,
  ];
  
  return dynamicTypes.includes(product.productType);
}

// При создании Batch
function calculateBatchExpiration(
  product: ProductTemplate,
  seller: Seller,
  supplierExpirationDate: Date,
  location: StorageLocation
): BatchExpirationResult {
  if (shouldUseDynamicShelfLife(product, seller)) {
    // Premium: динамический расчёт
    return {
      expirationDate: supplierExpirationDate,
      effectiveExpirationDate: calculateEffectiveExpiration(
        supplierExpirationDate,
        product.storageConditions,
        location
      ),
      freshnessRemaining: calculateFreshnessRemaining(
        supplierExpirationDate,
        product.storageConditions
      ),
      isDynamic: true,
    };
  } else {
    // Бесплатно: статический срок
    return {
      expirationDate: supplierExpirationDate,
      effectiveExpirationDate: supplierExpirationDate, // не пересчитываем
      freshnessRemaining: null,
      isDynamic: false,
    };
  }
}
```

### 5. StorageLocation (складская часть с зонами)

```typescript
// ═══════════════════════════════════════════════════════════════
// ТИПЫ ЗОН ХРАНЕНИЯ
// ═══════════════════════════════════════════════════════════════

export enum StorageZoneType {
  FREEZER = 'FREEZER',           // Морозильная камера (-18°C и ниже)
  REFRIGERATOR = 'REFRIGERATOR', // Холодильник (0-4°C)
  COOL_ROOM = 'COOL_ROOM',       // Прохладная комната (10-15°C)
  ROOM_TEMP = 'ROOM_TEMP',       // Комнатная температура (18-22°C)
  SHOWCASE = 'SHOWCASE',         // Витрина (открытая выкладка)
  BACKROOM = 'BACKROOM',         // Подсобное помещение
}

// ═══════════════════════════════════════════════════════════════
// АКТУАЛЬНЫЕ УСЛОВИЯ ХРАНЕНИЯ
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class StorageConditionsReading {
  /** Температура (°C) */
  @Prop({ type: Number })
  temperature?: number;

  /** Влажность (%) */
  @Prop({ type: Number, min: 0, max: 100 })
  humidity?: number;

  /** Время замера */
  @Prop({ type: Date, default: Date.now })
  measuredAt: Date;

  /** Источник данных */
  @Prop({ type: String, enum: ['MANUAL', 'SENSOR', 'ESTIMATED'], default: 'MANUAL' })
  source: 'MANUAL' | 'SENSOR' | 'ESTIMATED';

  /** ID датчика (если source = SENSOR) */
  @Prop({ type: String })
  sensorId?: string;

  /** Кто установил вручную (если source = MANUAL) */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  setBy?: Types.ObjectId;
}

// StorageLocation — складская локация (Shop или Warehouse)
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class StorageLocation {
  _id: Types.ObjectId;

  /** Владелец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Тип локации */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  type: LocationType;

  /** Ссылка на Shop (если SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shop?: Types.ObjectId;

  /** Ссылка на Warehouse (если WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', index: true })
  warehouse?: Types.ObjectId;

  /** Название (для удобства) */
  @Prop({ type: String, required: true })
  name: string;

  // ═══════════════════════════════════════════════════════════════
  // ЗОНЫ ХРАНЕНИЯ
  // ═══════════════════════════════════════════════════════════════

  /** Тип зоны хранения */
  @Prop({ type: String, enum: Object.values(StorageZoneType), required: true })
  zoneType: StorageZoneType;

  /** Родительская локация (для вложенных зон, например: Склад → Морозильник) */
  @Prop({ type: Types.ObjectId, ref: 'StorageLocation' })
  parentLocation?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // УСЛОВИЯ ХРАНЕНИЯ (ручные или динамические)
  // ═══════════════════════════════════════════════════════════════
  
  /** 
   * Режим измерения условий:
   * MANUAL — устанавливается вручную
   * DYNAMIC — измеряется датчиками (💎 Premium)
   */
  @Prop({ type: String, enum: ['MANUAL', 'DYNAMIC'], default: 'MANUAL' })
  conditionsMode: 'MANUAL' | 'DYNAMIC';

  /** Актуальные условия хранения */
  @Prop({ type: StorageConditionsReadingSchema })
  currentConditions?: StorageConditionsReading;

  /** История показаний (последние N записей, для DYNAMIC режима) */
  @Prop({ type: [StorageConditionsReadingSchema], default: [] })
  conditionsHistory: StorageConditionsReading[];

  // ═══════════════════════════════════════════════════════════════
  // ЦЕЛЕВЫЕ УСЛОВИЯ (для контроля отклонений)
  // ═══════════════════════════════════════════════════════════════

  /** Целевая температура MIN */
  @Prop({ type: Number })
  targetTempMin?: number;

  /** Целевая температура MAX */
  @Prop({ type: Number })
  targetTempMax?: number;

  /** Целевая влажность MIN */
  @Prop({ type: Number, min: 0, max: 100 })
  targetHumidityMin?: number;

  /** Целевая влажность MAX */
  @Prop({ type: Number, min: 0, max: 100 })
  targetHumidityMax?: number;

  // ═══════════════════════════════════════════════════════════════
  // РАСЧЁТНЫЕ ПОЛЯ
  // ═══════════════════════════════════════════════════════════════

  /** Температурный диапазон (автоматически из zoneType или currentConditions) */
  @Prop({ type: String, enum: Object.values(TemperatureRange) })
  temperatureRange?: TemperatureRange;

  /** Диапазон влажности */
  @Prop({ type: String, enum: Object.values(HumidityRange) })
  humidityRange?: HumidityRange;

  /** Есть ли контроль атмосферы (CA) */
  @Prop({ type: Boolean, default: false })
  hasControlledAtmosphere: boolean;

  /** Коэффициент деградации по умолчанию (рассчитывается или задаётся) */
  @Prop({ type: Number, default: 1.0 })
  defaultDegradationCoefficient: number;

  /** Есть отклонение от целевых условий? */
  @Prop({ type: Boolean, default: false })
  hasConditionsAlert: boolean;

  @Prop({ type: String, enum: Object.values(StorageLocationStatus), default: StorageLocationStatus.ACTIVE })
  status: StorageLocationStatus;
}

export enum LocationType {
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
}

// Пример структуры склада с зонами:
// ┌─────────────────────────────────────────────────┐
// │ Склад "Центральный"                             │
// ├─────────────────────────────────────────────────┤
// │ ├── Морозильная камера (-18°C)                  │
// │ │   └── Зона A (замороженные ягоды)             │
// │ │   └── Зона B (мороженое)                      │
// │ ├── Холодильник 1 (0-4°C)                       │
// │ │   └── Зона молочки                            │
// │ │   └── Зона ягод                               │
// │ ├── Холодильник 2 (10-15°C)                     │
// │ │   └── Зона цитрусовых                         │
// │ └── Сухой склад (18-22°C)                       │
// │     └── Консервы                                │
// │     └── Крупы                                   │
// └─────────────────────────────────────────────────┘
```

---

## Фазы реализации

### Фаза 1: Ядро системы (2-3 дня)

**Цель:** Создать базовые типы, пресеты коэффициентов и калькулятор сроков годности.

#### 1.1 Storage Presets (пресеты коэффициентов)

```typescript
// core/storage-preset/storage-preset.enums.ts
export enum StoragePreset {
  BERRIES = 'BERRIES',           // Ягоды
  STONE_FRUITS = 'STONE_FRUITS', // Косточковые
  CITRUS = 'CITRUS',             // Цитрусовые
  APPLES_PEARS = 'APPLES_PEARS', // Яблоки, груши
  TROPICAL = 'TROPICAL',         // Тропические
  LEAFY_GREENS = 'LEAFY_GREENS', // Листовая зелень
  ROOT_VEGETABLES = 'ROOT_VEGETABLES', // Корнеплоды
  TOMATOES = 'TOMATOES',         // Томаты
  CUCUMBERS = 'CUCUMBERS',       // Огурцы
  MUSHROOMS = 'MUSHROOMS',       // Грибы
  GENERIC = 'GENERIC',           // Общий (по умолчанию)
}

export enum TemperatureRange {
  COLD = 'COLD',           // 0-4°C
  COOL = 'COOL',           // 10-15°C
  ROOM = 'ROOM',           // 18-22°C
  WARM = 'WARM',           // >25°C
}

export enum HumidityRange {
  DRY = 'DRY',             // <50%
  NORMAL = 'NORMAL',       // 50-70%
  HUMID = 'HUMID',         // 70-90%
  VERY_HUMID = 'VERY_HUMID', // >90%
}
```

```typescript
// core/storage-preset/storage-preset.config.ts
export interface PresetCoefficients {
  temperature: Record<TemperatureRange, number>;
  humidity: Record<HumidityRange, number>;
  criticalCombinations?: CriticalCombination[];
}

export interface CriticalCombination {
  temperature: TemperatureRange;
  humidity: HumidityRange;
  coefficient: number; // Переопределяет расчёт
}

export const STORAGE_PRESET_CONFIG: Record<StoragePreset, PresetCoefficients> = {
  [StoragePreset.BERRIES]: {
    temperature: {
      [TemperatureRange.COLD]: 0.4,
      [TemperatureRange.COOL]: 0.8,
      [TemperatureRange.ROOM]: 1.5,
      [TemperatureRange.WARM]: 3.0,
    },
    humidity: {
      [HumidityRange.DRY]: 1.8,
      [HumidityRange.NORMAL]: 1.3,
      [HumidityRange.HUMID]: 1.0,
      [HumidityRange.VERY_HUMID]: 0.9,
    },
    criticalCombinations: [
      { temperature: TemperatureRange.WARM, humidity: HumidityRange.DRY, coefficient: 8.0 },
    ],
  },
  // ... остальные пресеты
};
```

#### 1.2 Storage Conditions (условия хранения)

```typescript
// core/storage-conditions/storage-conditions.schema.ts
@Schema({ _id: false })
export class StorageConditions {
  /** Идеальная температура (мин) */
  @Prop({ type: Number })
  idealTempMin?: number;

  /** Идеальная температура (макс) */
  @Prop({ type: Number })
  idealTempMax?: number;

  /** Идеальная влажность (мин) */
  @Prop({ type: Number })
  idealHumidityMin?: number;

  /** Идеальная влажность (макс) */
  @Prop({ type: Number })
  idealHumidityMax?: number;

  /** Базовый срок годности в днях (при идеальных условиях) */
  @Prop({ type: Number, required: true })
  baseShelfLifeDays: number;

  /** Пресет коэффициентов */
  @Prop({ type: String, enum: Object.values(StoragePreset), default: StoragePreset.GENERIC })
  preset: StoragePreset;

  /** Чувствительность к условиям (LOW, MEDIUM, HIGH) */
  @Prop({ type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' })
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

#### 1.3 Shelf Life Calculator

```typescript
// core/shelf-life-calculator/shelf-life-calculator.service.ts
@Injectable()
export class ShelfLifeCalculatorService {
  /**
   * Рассчитывает коэффициент деградации для условий хранения
   */
  calculateDegradationCoefficient(
    preset: StoragePreset,
    temperature: number,
    humidity: number,
  ): number;

  /**
   * Рассчитывает потраченную свежесть за время в локации
   */
  calculateFreshnessConsumed(
    freshnessRemaining: number,
    hoursInLocation: number,
    coefficient: number,
  ): number;

  /**
   * Рассчитывает новый effectiveExpirationDate при перемещении
   */
  calculateNewExpirationDate(
    freshnessRemaining: number,
    newLocationCoefficient: number,
    moveDate: Date,
  ): Date;

  /**
   * Пересчитывает срок партии при перемещении
   */
  recalculateBatchShelfLife(input: {
    batch: Batch;
    oldLocation: Location;
    newLocation: Location;
    moveDate: Date;
  }): { newFreshnessRemaining: number; newExpirationDate: Date };
}
```

#### Файлы Фазы 1:

- `core/storage-preset/storage-preset.enums.ts`
- `core/storage-preset/storage-preset.config.ts`
- `core/storage-preset/index.ts`
- `core/storage-conditions/storage-conditions.schema.ts`
- `core/storage-conditions/index.ts`
- `core/shelf-life-calculator/shelf-life-calculator.service.ts`
- `core/shelf-life-calculator/shelf-life-calculator.module.ts`
- `core/shelf-life-calculator/index.ts`
- `core/index.ts`
- `location/location.types.ts`

---

### Фаза 2: Партии и остатки (3-4 дня)

**Цель:** Создать модули Batch и BatchLocation с поддержкой динамических сроков и FEFO.

#### 2.1 Batch (партия товара)

```typescript
// batch/batch.schema.ts
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Batch {
  _id: Types.ObjectId;
  readonly batchId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Владелец (продавец) */
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true, index: true })
  seller: Types.ObjectId;

  /** Товар (Product из основного модуля) */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  /** Номер партии */
  @Prop({ type: String, required: true })
  batchNumber: string;

  /** Дата производства */
  @Prop({ type: Date })
  productionDate?: Date;

  // ═══════════════════════════════════════════════════════════════
  // СРОКИ ГОДНОСТИ
  // ═══════════════════════════════════════════════════════════════

  /** Оригинальный срок от поставщика */
  @Prop({ type: Date, required: true })
  originalExpirationDate: Date;

  /** Расчётный срок (динамический, пересчитывается) */
  @Prop({ type: Date, required: true, index: true })
  effectiveExpirationDate: Date;

  /** Запас свежести в условных днях */
  @Prop({ type: Number, required: true })
  freshnessRemaining: number;

  /** Начальный запас свежести (для аналитики) */
  @Prop({ type: Number, required: true })
  initialFreshness: number;

  // ═══════════════════════════════════════════════════════════════
  // ПОСТАВЩИК
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  supplier?: string;

  @Prop({ type: String })
  supplierInvoice?: string;

  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  // ═══════════════════════════════════════════════════════════════
  // КОЛИЧЕСТВО И СТАТУС
  // ═══════════════════════════════════════════════════════════════

  /** Начальное количество при приёмке */
  @Prop({ type: Number, min: 0, required: true })
  initialQuantity: number;

  /** Текущее общее количество (сумма по всем локациям) */
  @Prop({ type: Number, min: 0, required: true })
  currentQuantity: number;

  @Prop({ type: String, enum: Object.values(BatchStatus), default: BatchStatus.ACTIVE })
  status: BatchStatus;

  @Prop({ type: String })
  blockReason?: string;

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ЛОКАЦИЙ
  // ═══════════════════════════════════════════════════════════════

  /** История перемещений (для аудита и расчёта сроков) */
  @Prop({ type: [BatchLocationHistorySchema], default: [] })
  locationHistory: BatchLocationHistory[];

  /** Текущая локация (последняя в истории) */
  @Prop({ type: BatchCurrentLocationSchema })
  currentLocation?: BatchCurrentLocation;

  // ═══════════════════════════════════════════════════════════════
  // РУЧНАЯ КОРРЕКТИРОВКА СВЕЖЕСТИ
  // ═══════════════════════════════════════════════════════════════

  /** История ручных корректировок свежести */
  @Prop({ type: [FreshnessAdjustmentSchema], default: [] })
  freshnessAdjustments: FreshnessAdjustment[];
}

// FreshnessAdjustment — запись о ручной корректировке свежести
@Schema({ _id: false })
export class FreshnessAdjustment {
  /** Время корректировки */
  @Prop({ type: Date, required: true })
  adjustedAt: Date;

  /** Кто сделал корректировку */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  adjustedBy: Types.ObjectId;

  /** Значение ДО корректировки */
  @Prop({ type: Number, required: true })
  previousFreshness: number;

  /** Новое значение */
  @Prop({ type: Number, required: true })
  newFreshness: number;

  /** Причина корректировки */
  @Prop({ type: String, required: true })
  reason: string;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}
```

```typescript
// batch/batch.enums.ts
export enum BatchStatus {
  ACTIVE = 'ACTIVE',         // Активна, можно продавать
  BLOCKED = 'BLOCKED',       // Заблокирована (возврат, проверка)
  EXPIRED = 'EXPIRED',       // Срок истёк
  DEPLETED = 'DEPLETED',     // Полностью израсходована
}

export enum ExpirationAlertLevel {
  NORMAL = 'NORMAL',         // > 7 дней
  WARNING = 'WARNING',       // 3-7 дней
  CRITICAL = 'CRITICAL',     // < 3 дней
  EXPIRED = 'EXPIRED',       // Истёк
}

// ═══════════════════════════════════════════════════════════════
// ПРИЧИНЫ СПИСАНИЯ
// ═══════════════════════════════════════════════════════════════

export enum WriteOffReason {
  EXPIRED = 'EXPIRED',               // Истёк срок годности
  DAMAGED = 'DAMAGED',               // Повреждён
  SPOILED = 'SPOILED',               // Испортился
  THEFT = 'THEFT',                   // Кража
  QUALITY_ISSUE = 'QUALITY_ISSUE',   // Проблемы с качеством
  INVENTORY_DIFF = 'INVENTORY_DIFF', // Недостача при инвентаризации
  FOR_PRODUCTION = 'FOR_PRODUCTION', // На производство (для homemade товаров)
  SAMPLE = 'SAMPLE',                 // Образец/дегустация
  OTHER = 'OTHER',                   // Прочее
}
```

#### 2.2 BatchLocation (остаток партии в локации)

```typescript
// batch-location/batch-location.schema.ts
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class BatchLocation {
  _id: Types.ObjectId;
  readonly batchLocationId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Партия */
  @Prop({ type: Types.ObjectId, ref: Batch.name, required: true, index: true })
  batch: Types.ObjectId;

  /** Тип локации */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  locationType: LocationType;

  /** Shop ID (если SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shop?: Types.ObjectId;

  /** Warehouse ID (если WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', index: true })
  warehouse?: Types.ObjectId;

  /** Текущий остаток в этой локации */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  quantity: number;

  /** Зарезервировано */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  reservedQuantity: number;

  /** Коэффициент деградации в этой локации */
  @Prop({ type: Number, required: true, default: 1.0 })
  degradationCoefficient: number;

  /** Дата прибытия в локацию (для расчёта потраченной свежести) */
  @Prop({ type: Date, required: true })
  arrivedAt: Date;

  @Prop({ type: String, enum: Object.values(BatchLocationStatus), default: BatchLocationStatus.ACTIVE })
  status: BatchLocationStatus;
}
```

#### 2.3 FEFO логика в BatchLocation

```typescript
// batch-location/batch-location.service.ts
@Injectable()
export class BatchLocationService implements BatchLocationPort {
  /**
   * Списать количество по FEFO (First Expired, First Out)
   * Сначала берём партии с ближайшим сроком годности
   */
  async consumeByFefo(command: ConsumeFifoCommand): Promise<ConsumeResult> {
    // 1. Найти все BatchLocation в указанной локации с quantity > 0
    // 2. Джойнить с Batch и сортировать по effectiveExpirationDate ASC
    // 3. Списывать по порядку, пока не наберём нужное количество
    // 4. Возвращать какие партии были затронуты
  }

  /**
   * Зарезервировать количество по FEFO
   */
  async reserveByFefo(command: ReserveFifoCommand): Promise<ReserveResult>;

  /**
   * Снять резерв
   */
  async releaseReservation(command: ReleaseReservationCommand): Promise<void>;

  /**
   * Получить агрегированный остаток в локации
   */
  async getAggregatedStock(query: GetAggregatedStockQuery): Promise<AggregatedStock>;
}
```

#### Файлы Фазы 2:

- `batch/batch.schema.ts`
- `batch/batch.enums.ts`
- `batch/batch.commands.ts`
- `batch/batch.queries.ts`
- `batch/batch.port.ts`
- `batch/batch.service.ts`
- `batch/batch.module.ts`
- `batch/index.ts`
- `batch-location/batch-location.schema.ts`
- `batch-location/batch-location.enums.ts`
- `batch-location/batch-location.commands.ts`
- `batch-location/batch-location.queries.ts`
- `batch-location/batch-location.port.ts`
- `batch-location/batch-location.service.ts`
- `batch-location/batch-location.module.ts`
- `batch-location/index.ts`

---

### Фаза 3: Операции - Приёмка и Перемещение (4-5 дней)

**Цель:** Реализовать Receiving и Transfer с интеграцией партий и пересчётом сроков.

#### 3.1 Receiving (приёмка)

```typescript
// operations/receiving/receiving.schema.ts
@Schema({ _id: false })
export class ReceivingItem {
  /** Product ID (не ShopProduct!) */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  /** Ожидаемое количество */
  @Prop({ type: Number, required: true, min: 0 })
  expectedQuantity: number;

  /** Фактическое количество */
  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  /** Срок годности для этой позиции */
  @Prop({ type: Date, required: true })
  expirationDate: Date;

  /** Дата производства (опционально) */
  @Prop({ type: Date })
  productionDate?: Date;

  /** Закупочная цена за единицу */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** ID созданной партии (после подтверждения) */
  @Prop({ type: Types.ObjectId, ref: 'Batch' })
  createdBatch?: Types.ObjectId;
}

@Schema({...})
export class Receiving {
  // ... стандартные поля

  /** Тип локации назначения */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  destinationType: LocationType;

  /** Shop (если SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop' })
  destinationShop?: Types.ObjectId;

  /** Warehouse (если WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  destinationWarehouse?: Types.ObjectId;

  @Prop({ type: [ReceivingItemSchema], required: true })
  items: ReceivingItem[];

  // ... supplier, status, etc.
}
```

**Workflow приёмки:**

```
DRAFT → CONFIRMED

При подтверждении:
1. Для каждой позиции:
   a. Создать Batch с:
      - originalExpirationDate = item.expirationDate
      - initialFreshness = рассчитать из Product.storageConditions
      - freshnessRemaining = initialFreshness
      - effectiveExpirationDate = рассчитать через ShelfLifeCalculator
   b. Создать BatchLocation в указанной локации
   c. Записать Movement
2. Обновить агрегированные остатки (ShopProduct/WarehouseProduct)
```

#### 3.2 Transfer (перемещение)

```typescript
// operations/transfer/transfer.schema.ts
@Schema({ _id: false })
export class TransferItem {
  /** Партия для перемещения (FEFO или указанная) */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Количество */
  @Prop({ type: Number, min: 0.001, required: true })
  quantity: number;

  /** Пересчитанный срок в новой локации */
  @Prop({ type: Date })
  newEffectiveExpiration?: Date;

  /** Пересчитанный запас свежести */
  @Prop({ type: Number })
  newFreshnessRemaining?: number;
}

@Schema({...})
export class Transfer {
  // ... documentNumber, status

  /** Откуда */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  sourceType: LocationType;

  @Prop({ type: Types.ObjectId })
  sourceShop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  sourceWarehouse?: Types.ObjectId;

  /** Куда */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  targetType: LocationType;

  @Prop({ type: Types.ObjectId })
  targetShop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  targetWarehouse?: Types.ObjectId;

  @Prop({ type: [TransferItemSchema], required: true })
  items: TransferItem[];

  // ... createdBy, sentBy, receivedBy, etc.
}
```

**Workflow перемещения:**

```
DRAFT → SENT → RECEIVED

При SENT:
1. Для каждой позиции:
   a. Уменьшить quantity в BatchLocation источника
   b. Записать Movement с type=TRANSFER_OUT
   c. Рассчитать новый срок через ShelfLifeCalculator

При RECEIVED:
1. Для каждой позиции:
   a. Создать/обновить BatchLocation в получателе
   b. Обновить Batch: effectiveExpirationDate, freshnessRemaining
   c. Добавить запись в Batch.locationHistory
   d. Записать Movement с type=TRANSFER_IN
2. Обновить агрегированные остатки
```

#### 3.3 WriteOff (списание)

```typescript
// operations/write-off/write-off.schema.ts
@Schema({ _id: false })
export class WriteOffItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Количество */
  @Prop({ type: Number, min: 0.001, required: true })
  quantity: number;

  /** Причина для конкретной позиции (может отличаться от общей) */
  @Prop({ type: String, enum: Object.values(WriteOffReason) })
  reason?: WriteOffReason;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}
```

#### Файлы Фазы 3:

- `operations/receiving/receiving.schema.ts`
- `operations/receiving/receiving.enums.ts`
- `operations/receiving/receiving.commands.ts`
- `operations/receiving/receiving.queries.ts`
- `operations/receiving/receiving.port.ts`
- `operations/receiving/receiving.service.ts`
- `operations/receiving/receiving.module.ts`
- `operations/receiving/index.ts`
- `operations/transfer/transfer.schema.ts`
- `operations/transfer/transfer.enums.ts`
- `operations/transfer/transfer.commands.ts`
- `operations/transfer/transfer.queries.ts`
- `operations/transfer/transfer.port.ts`
- `operations/transfer/transfer.service.ts`
- `operations/transfer/transfer.module.ts`
- `operations/transfer/index.ts`
- `operations/write-off/write-off.schema.ts`
- `operations/write-off/write-off.enums.ts`
- `operations/write-off/write-off.commands.ts`
- `operations/write-off/write-off.queries.ts`
- `operations/write-off/write-off.port.ts`
- `operations/write-off/write-off.service.ts`
- `operations/write-off/write-off.module.ts`
- `operations/write-off/index.ts`

---

### Фаза 4: Возвраты (2-3 дня)

**Цель:** Реализовать модуль возвратов с оценкой состояния и пересчётом сроков.

#### 4.1 Return (возврат)

```typescript
// operations/return/return.schema.ts
export enum ReturnType {
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',   // От клиента
  DELIVERY_RETURN = 'DELIVERY_RETURN',   // Курьер не доставил
  SUPPLIER_RETURN = 'SUPPLIER_RETURN',   // Возврат поставщику
}

export enum ReturnStatus {
  PENDING_INSPECTION = 'PENDING_INSPECTION', // Ожидает оценки
  INSPECTED = 'INSPECTED',                   // Оценён
  COMPLETED = 'COMPLETED',                   // Завершён
  REJECTED = 'REJECTED',                     // Отклонён (поставщиком)
}

export enum ReturnItemDecision {
  RETURN_TO_SHELF = 'RETURN_TO_SHELF',       // Вернуть на полку
  RETURN_WITH_DISCOUNT = 'RETURN_WITH_DISCOUNT', // Со скидкой
  WRITE_OFF = 'WRITE_OFF',                   // Списать
}

@Schema({ _id: false })
export class ReturnItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Количество */
  @Prop({ type: Number, min: 0.001, required: true })
  quantity: number;

  /** Время вне контролируемых условий (минуты) */
  @Prop({ type: Number, min: 0 })
  minutesOutOfControl?: number;

  /** Оценка состояния */
  @Prop({ type: String, enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'UNSATISFACTORY'] })
  condition?: string;

  /** Решение */
  @Prop({ type: String, enum: Object.values(ReturnItemDecision) })
  decision?: ReturnItemDecision;

  /** Скидка % (если RETURN_WITH_DISCOUNT) */
  @Prop({ type: Number, min: 0, max: 100 })
  discountPercent?: number;

  /** Пересчитанный срок после возврата */
  @Prop({ type: Date })
  newEffectiveExpiration?: Date;
}

@Schema({...})
export class Return {
  // ... стандартные поля

  @Prop({ type: String, enum: Object.values(ReturnType), required: true })
  type: ReturnType;

  /** Локация возврата */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  warehouse?: Types.ObjectId;

  /** Связанный заказ (для CUSTOMER_RETURN, DELIVERY_RETURN) */
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReturnStatus) })
  status: ReturnStatus;

  @Prop({ type: [ReturnItemSchema], required: true })
  items: ReturnItem[];

  // ... reason, photos, etc.
}
```

**Workflow возврата:**

```
PENDING_INSPECTION → INSPECTED → COMPLETED

При INSPECTED:
1. Для каждой позиции:
   a. Рассчитать потерю свежести за minutesOutOfControl
   b. Определить решение на основе матрицы (см. inventory-system-explained-v2.md)
   c. Записать decision

При COMPLETED:
1. Для каждой позиции согласно decision:
   - RETURN_TO_SHELF: создать BatchLocation, обновить Batch.effectiveExpirationDate
   - RETURN_WITH_DISCOUNT: то же + пометить партию для скидки
   - WRITE_OFF: создать WriteOff документ
2. Записать Movement
```

#### Файлы Фазы 4:

- `operations/return/return.schema.ts`
- `operations/return/return.enums.ts`
- `operations/return/return.commands.ts`
- `operations/return/return.queries.ts`
- `operations/return/return.port.ts`
- `operations/return/return.service.ts`
- `operations/return/return.module.ts`
- `operations/return/index.ts`

---

### Фаза 5: История движений и резервирование (2-3 дня)

**Цель:** Реализовать Movement (история) и Reservation (резервы под заказы).

#### 5.1 Movement (история движений)

```typescript
// movement/movement.schema.ts
export enum MovementType {
  // Приход
  RECEIVING = 'RECEIVING',           // Приёмка от поставщика
  TRANSFER_IN = 'TRANSFER_IN',       // Приход по перемещению
  RETURN_TO_STOCK = 'RETURN_TO_STOCK', // Возврат на полку
  ADJUSTMENT_PLUS = 'ADJUSTMENT_PLUS', // Корректировка +

  // Расход
  SALE = 'SALE',                     // Продажа (онлайн)
  OFFLINE_SALE = 'OFFLINE_SALE',     // Офлайн продажа
  TRANSFER_OUT = 'TRANSFER_OUT',     // Отправка по перемещению
  WRITE_OFF = 'WRITE_OFF',           // Списание
  ADJUSTMENT_MINUS = 'ADJUSTMENT_MINUS', // Корректировка -

  // Резервирование
  RESERVATION = 'RESERVATION',       // Создание резерва
  RESERVATION_RELEASE = 'RESERVATION_RELEASE', // Снятие резерва
}

@Schema({...})
export class Movement {
  // ... стандартные поля

  @Prop({ type: String, enum: Object.values(MovementType), required: true })
  type: MovementType;

  /** Партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Локация */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  warehouse?: Types.ObjectId;

  /** Изменение количества (+/-) */
  @Prop({ type: Number, required: true })
  quantityChange: number;

  /** Остаток партии в локации ДО */
  @Prop({ type: Number, required: true })
  balanceBefore: number;

  /** Остаток партии в локации ПОСЛЕ */
  @Prop({ type: Number, required: true })
  balanceAfter: number;

  /** Связанный документ */
  @Prop({ type: MovementDocumentRefSchema })
  document?: MovementDocumentRef;

  /** Актор */
  @Prop({ type: MovementActorSchema, required: true })
  actor: MovementActor;
}
```

#### 5.2 Reservation (резервирование)

```typescript
// reservation/reservation.schema.ts
@Schema({ _id: false })
export class ReservationItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** BatchLocation */
  @Prop({ type: Types.ObjectId, ref: 'BatchLocation', required: true })
  batchLocation: Types.ObjectId;

  /** Зарезервированное количество */
  @Prop({ type: Number, min: 0.001, required: true })
  quantity: number;
}

@Schema({...})
export class Reservation {
  // ... стандартные поля

  /** Заказ */
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  order: Types.ObjectId;

  /** Локация (магазин) */
  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ReservationStatus), default: ReservationStatus.ACTIVE })
  status: ReservationStatus;

  /** Время жизни резерва */
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: [ReservationItemSchema], required: true })
  items: ReservationItem[];
}
```

#### Файлы Фазы 5:

- `movement/movement.schema.ts`
- `movement/movement.enums.ts`
- `movement/movement.commands.ts`
- `movement/movement.queries.ts`
- `movement/movement.port.ts`
- `movement/movement.service.ts`
- `movement/movement.module.ts`
- `movement/index.ts`
- `reservation/reservation.schema.ts`
- `reservation/reservation.enums.ts`
- `reservation/reservation.commands.ts`
- `reservation/reservation.queries.ts`
- `reservation/reservation.port.ts`
- `reservation/reservation.service.ts`
- `reservation/reservation.module.ts`
- `reservation/index.ts`

---

### Фаза 6: Инвентаризация и алерты (2-3 дня)

**Цель:** Реализовать инвентаризацию и систему алертов по срокам годности.

#### 6.1 Audit (инвентаризация)

```typescript
// operations/audit/audit.schema.ts
@Schema({ _id: false })
export class AuditItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Ожидаемое количество (из системы) */
  @Prop({ type: Number, required: true })
  expectedQuantity: number;

  /** Фактическое количество (введённое) */
  @Prop({ type: Number })
  actualQuantity?: number;

  /** Расхождение (actualQuantity - expectedQuantity) */
  @Prop({ type: Number })
  discrepancy?: number;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}

@Schema({...})
export class Audit {
  // ... стандартные поля

  @Prop({ type: String, enum: Object.values(AuditType), required: true })
  type: AuditType; // FULL, PARTIAL, CONTROL

  /** Локация */
  @Prop({ type: String, enum: Object.values(LocationType), required: true })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  warehouse?: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(AuditStatus) })
  status: AuditStatus; // DRAFT, IN_PROGRESS, COMPLETED

  @Prop({ type: [AuditItemSchema], required: true })
  items: AuditItem[];

  /** Применить корректировки к остаткам */
  @Prop({ type: Boolean, default: false })
  applyCorrections: boolean;
}
```

#### 6.2 Expiration Alerts

```typescript
// alerts/expiration-alert.service.ts
@Injectable()
export class ExpirationAlertService {
  /**
   * Получить партии по уровням алертов
   */
  async getBatchesByAlertLevel(query: {
    sellerId: string;
    locationType?: LocationType;
    locationId?: string;
  }): Promise<{
    critical: Batch[];  // < 3 дней
    warning: Batch[];   // 3-7 дней
    expired: Batch[];   // истекли
  }>;

  /**
   * Создать ежедневный отчёт для Telegram
   */
  async generateDailyReport(sellerId: string): Promise<ExpirationReport>;

  /**
   * Автоматически заблокировать истёкшие партии
   */
  async blockExpiredBatches(): Promise<number>;

  /**
   * Автоматически создать списания для истёкших
   */
  async autoWriteOffExpired(sellerId: string): Promise<WriteOff[]>;
}
```

#### Файлы Фазы 6:

- `operations/audit/audit.schema.ts`
- `operations/audit/audit.enums.ts`
- `operations/audit/audit.commands.ts`
- `operations/audit/audit.queries.ts`
- `operations/audit/audit.port.ts`
- `operations/audit/audit.service.ts`
- `operations/audit/audit.module.ts`
- `operations/audit/index.ts`
- `alerts/expiration-alert.service.ts`
- `alerts/expiration-alert.module.ts`
- `alerts/index.ts`

---

### Фаза 7: Оркестратор и интеграция (3-4 дня)

**Цель:** Создать оркестратор для координации всех операций и подготовить интеграцию.

#### 7.1 Inventory Orchestrator

```typescript
// orchestrator/inventory.orchestrator.ts
@Injectable()
export class InventoryOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT) private readonly batchLocationPort: BatchLocationPort,
    @Inject(RECEIVING_PORT) private readonly receivingPort: ReceivingPort,
    @Inject(TRANSFER_PORT) private readonly transferPort: TransferPort,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    @Inject(RETURN_PORT) private readonly returnPort: ReturnPort,
    @Inject(AUDIT_PORT) private readonly auditPort: AuditPort,
    @Inject(MOVEMENT_PORT) private readonly movementPort: MovementPort,
    @Inject(RESERVATION_PORT) private readonly reservationPort: ReservationPort,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
    private readonly expirationAlerts: ExpirationAlertService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // ПРИЁМКА
  // ═══════════════════════════════════════════════════════════════

  async createReceiving(input: CreateReceivingInput): Promise<Receiving>;
  async confirmReceiving(input: ConfirmReceivingInput): Promise<Receiving>;

  // ═══════════════════════════════════════════════════════════════
  // ПЕРЕМЕЩЕНИЕ
  // ═══════════════════════════════════════════════════════════════

  async createTransfer(input: CreateTransferInput): Promise<Transfer>;
  async sendTransfer(input: SendTransferInput): Promise<Transfer>;
  async receiveTransfer(input: ReceiveTransferInput): Promise<Transfer>;

  // ═══════════════════════════════════════════════════════════════
  // СПИСАНИЕ
  // ═══════════════════════════════════════════════════════════════

  async createWriteOff(input: CreateWriteOffInput): Promise<WriteOff>;
  async confirmWriteOff(input: ConfirmWriteOffInput): Promise<WriteOff>;

  // ═══════════════════════════════════════════════════════════════
  // ВОЗВРАТЫ
  // ═══════════════════════════════════════════════════════════════

  async createReturn(input: CreateReturnInput): Promise<Return>;
  async inspectReturn(input: InspectReturnInput): Promise<Return>;
  async completeReturn(input: CompleteReturnInput): Promise<Return>;

  // ═══════════════════════════════════════════════════════════════
  // ИНВЕНТАРИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  async createAudit(input: CreateAuditInput): Promise<Audit>;
  async startAudit(input: StartAuditInput): Promise<Audit>;
  async updateAuditItems(input: UpdateAuditItemsInput): Promise<Audit>;
  async completeAudit(input: CompleteAuditInput): Promise<Audit>;

  // ═══════════════════════════════════════════════════════════════
  // РЕЗЕРВИРОВАНИЕ (для заказов)
  // ═══════════════════════════════════════════════════════════════

  async reserveForOrder(input: ReserveForOrderInput): Promise<Reservation>;
  async releaseReservation(input: ReleaseReservationInput): Promise<void>;
  async consumeReservation(input: ConsumeReservationInput): Promise<void>;

  // ═══════════════════════════════════════════════════════════════
  // ОФЛАЙН ПРОДАЖА
  // ═══════════════════════════════════════════════════════════════

  async checkOfflineSaleConflict(input: CheckConflictInput): Promise<ConflictResult>;
  async processOfflineSale(input: ProcessOfflineSaleInput): Promise<void>;

  // ═══════════════════════════════════════════════════════════════
  // ОСТАТКИ
  // ═══════════════════════════════════════════════════════════════

  async getLocationStock(query: GetLocationStockQuery): Promise<LocationStock>;
  async getProductStock(query: GetProductStockQuery): Promise<ProductStock>;
}
```

  // ═══════════════════════════════════════════════════════════════
  // СМЕШИВАНИЕ ПАРТИЙ
  // ═══════════════════════════════════════════════════════════════

  async mixBatches(input: MixBatchesInput): Promise<MixedBatch>;

  // ═══════════════════════════════════════════════════════════════
  // ЦЕНООБРАЗОВАНИЕ
  // ═══════════════════════════════════════════════════════════════

  async updateStorefrontProductPricing(input: UpdatePricingInput): Promise<StorefrontProduct>;
  async applyDiscount(input: ApplyDiscountInput): Promise<StorefrontProduct>;
  async removeDiscount(input: RemoveDiscountInput): Promise<StorefrontProduct>;
  async autoApplyExpirationDiscounts(storefrontId: string): Promise<number>;
}
```

#### 7.2 Интеграция с существующими модулями

**Стратегия:** Не модифицируем старые модули напрямую. Создаём новые сущности в new-inventory и устанавливаем связи.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ИНТЕГРАЦИЯ (обратная совместимость)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  СТАРЫЕ МОДУЛИ (не трогаем)         НОВЫЕ МОДУЛИ (new-inventory)           │
│  ─────────────────────────          ─────────────────────────────          │
│                                                                             │
│  Product ─────────────────────────► ProductTemplate                        │
│    (legacyProduct ref)               + storageConditions                   │
│                                      + recommendedRetailPrice               │
│                                      + returnable settings                  │
│                                                                             │
│  Shop ────────────────────────────► StorageLocation (type=SHOP)            │
│    (shop ref)                        + температура/влажность                │
│                                      + коэффициент деградации               │
│                                                                             │
│                                    ► Storefront                             │
│                                      + StorefrontProduct[]                  │
│                                      + pricing (онлайн/офлайн/скидки)       │
│                                                                             │
│  Warehouse ───────────────────────► StorageLocation (type=WAREHOUSE)       │
│    (warehouse ref)                   + температура/влажность                │
│                                      + коэффициент деградации               │
│                                                                             │
│  ShopProduct ─────────────────────► StorefrontProduct                      │
│    (legacyShopProduct ref)           + ProductPricing                       │
│                                      + остатки из BatchLocation             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Миграция данных:**

```typescript
// 1. Создание ProductTemplate из Product
const productTemplate = await productTemplatePort.createFromLegacy({
  legacyProductId: product._id,
  storageConditions: inferStorageConditions(product.category),
});

// 2. Создание StorageLocation для Shop
const storageLocation = await storageLocationPort.create({
  type: LocationType.SHOP,
  shop: shop._id,
  name: `${shop.shopName} - Склад`,
  temperatureRange: TemperatureRange.ROOM, // по умолчанию
});

// 3. Создание Storefront для Shop
const storefront = await storefrontPort.create({
  shop: shop._id,
  storageLocation: storageLocation._id,
  products: await migrateShopProducts(shop._id),
});

// 4. Миграция ShopProduct в StorefrontProduct
async function migrateShopProducts(shopId: string): Promise<StorefrontProduct[]> {
  const shopProducts = await shopProductModel.find({ pinnedTo: shopId });
  
  return shopProducts.map(sp => ({
    product: productTemplateByLegacy[sp.product],
    legacyShopProduct: sp._id,
    isVisible: sp.status === 'ACTIVE',
    pricing: {
      onlinePrice: sp.product.price, // из старого Product
      offlinePrice: sp.product.price,
      purchasePrice: null, // заполнится из Batch
    },
  }));
}
```

#### Файлы Фазы 7:

- `orchestrator/inventory.orchestrator.ts`
- `orchestrator/inventory.orchestrator.types.ts`
- `orchestrator/index.ts`
- `new-inventory.module.ts`
- `index.ts`

---

### Фаза 8: Базовые сущности (2-3 дня)

**Цель:** Создать ProductTemplate, StorageLocation, Storefront.

#### 8.1 ProductTemplate

```typescript
// entities/product-template/product-template.port.ts
export interface ProductTemplatePort {
  create(command: CreateProductTemplateCommand): Promise<ProductTemplate>;
  createFromLegacy(command: CreateFromLegacyCommand): Promise<ProductTemplate>;
  update(command: UpdateProductTemplateCommand): Promise<ProductTemplate>;
  getById(query: GetByIdQuery): Promise<ProductTemplate | null>;
  getBySeller(query: GetBySellerQuery): Promise<ProductTemplate[]>;
  getByLegacyProduct(query: GetByLegacyProductQuery): Promise<ProductTemplate | null>;
}
```

#### 8.2 StorageLocation

```typescript
// entities/storage-location/storage-location.port.ts
export interface StorageLocationPort {
  create(command: CreateStorageLocationCommand): Promise<StorageLocation>;
  update(command: UpdateStorageLocationCommand): Promise<StorageLocation>;
  updateConditions(command: UpdateConditionsCommand): Promise<StorageLocation>;
  getById(query: GetByIdQuery): Promise<StorageLocation | null>;
  getByShop(query: GetByShopQuery): Promise<StorageLocation | null>;
  getByWarehouse(query: GetByWarehouseQuery): Promise<StorageLocation | null>;
  recalculateDegradationCoefficient(locationId: string): Promise<number>;
}
```

#### 8.3 Storefront

```typescript
// entities/storefront/storefront.port.ts
export interface StorefrontPort {
  create(command: CreateStorefrontCommand): Promise<Storefront>;
  addProduct(command: AddProductCommand): Promise<Storefront>;
  updateProductPricing(command: UpdateProductPricingCommand): Promise<Storefront>;
  updateProductVisibility(command: UpdateVisibilityCommand): Promise<Storefront>;
  applyDiscount(command: ApplyDiscountCommand): Promise<Storefront>;
  removeDiscount(command: RemoveDiscountCommand): Promise<Storefront>;
  getById(query: GetByIdQuery): Promise<Storefront | null>;
  getByShop(query: GetByShopQuery): Promise<Storefront | null>;
  getProducts(query: GetProductsQuery): Promise<StorefrontProduct[]>;
  calculateFinalPrice(query: CalculatePriceQuery): Promise<PriceCalculation>;
}
```

#### Файлы Фазы 8:

- `entities/product-template/product-template.schema.ts`
- `entities/product-template/product-template.enums.ts`
- `entities/product-template/product-template.commands.ts`
- `entities/product-template/product-template.queries.ts`
- `entities/product-template/product-template.port.ts`
- `entities/product-template/product-template.service.ts`
- `entities/product-template/product-template.module.ts`
- `entities/product-template/index.ts`
- `entities/storage-location/storage-location.schema.ts`
- `entities/storage-location/storage-location.enums.ts`
- `entities/storage-location/storage-location.commands.ts`
- `entities/storage-location/storage-location.queries.ts`
- `entities/storage-location/storage-location.port.ts`
- `entities/storage-location/storage-location.service.ts`
- `entities/storage-location/storage-location.module.ts`
- `entities/storage-location/index.ts`
- `entities/storefront/storefront.schema.ts`
- `entities/storefront/storefront-product.schema.ts`
- `entities/storefront/storefront.enums.ts`
- `entities/storefront/storefront.commands.ts`
- `entities/storefront/storefront.queries.ts`
- `entities/storefront/storefront.port.ts`
- `entities/storefront/storefront.service.ts`
- `entities/storefront/storefront.module.ts`
- `entities/storefront/index.ts`
- `entities/index.ts`

---

### Фаза 9: Ценообразование (2-3 дня)

**Цель:** Реализовать модуль Pricing с онлайн/офлайн ценами, скидками, оптовыми ценами.

#### 9.1 Pricing Service

```typescript
// pricing/pricing.service.ts
@Injectable()
export class PricingService implements PricingPort {
  /**
   * Рассчитать финальную цену с учётом всех факторов
   */
  calculateFinalPrice(input: {
    storefrontProduct: StorefrontProduct;
    quantity: number;
    channel: 'online' | 'offline';
    promoCode?: string;
  }): PriceCalculation;

  /**
   * Обновить закупочную цену из новой партии
   */
  updatePurchasePriceFromBatch(input: {
    storefrontId: string;
    productId: string;
    batchPurchasePrice: number;
    strategy: 'LAST' | 'WEIGHTED_AVERAGE' | 'FIFO_AVERAGE';
  }): Promise<void>;

  /**
   * Автоматически применить скидки по сроку годности
   */
  autoApplyExpirationDiscounts(input: {
    storefrontId: string;
    rules: ExpirationDiscountRule[];
  }): Promise<AppliedDiscount[]>;

  /**
   * Рассчитать маржинальность
   */
  calculateMargin(pricing: ProductPricing): MarginInfo;

  /**
   * Проверить, выгодна ли текущая цена
   */
  isProfitable(pricing: ProductPricing, minMarginPercent: number): boolean;
}

// Правила автоскидок по сроку
interface ExpirationDiscountRule {
  daysUntilExpiration: number; // < N дней до истечения
  discountPercent: number;     // применить скидку %
}

// Пример правил:
const defaultRules: ExpirationDiscountRule[] = [
  { daysUntilExpiration: 3, discountPercent: 30 },
  { daysUntilExpiration: 5, discountPercent: 20 },
  { daysUntilExpiration: 7, discountPercent: 10 },
];
```

#### Файлы Фазы 9:

- `pricing/pricing.schema.ts`
- `pricing/pricing.enums.ts`
- `pricing/pricing.commands.ts`
- `pricing/pricing.queries.ts`
- `pricing/pricing.port.ts`
- `pricing/pricing.service.ts`
- `pricing/pricing.module.ts`
- `pricing/index.ts`

---

### Фаза 10: Смешивание партий (1-2 дня)

**Цель:** Реализовать операцию смешивания партий.

#### 10.1 Mixing Operation

```typescript
// operations/mixing/mixing.service.ts
@Injectable()
export class MixingService implements MixingPort {
  /**
   * Создать смешанную партию
   */
  async mixBatches(command: MixBatchesCommand): Promise<MixedBatch> {
    // Валидация:
    // - Все источники одного товара
    // - Все источники в одной локации
    // - Достаточное количество в каждом источнике
    
    // Расчёт:
    // - effectiveExpirationDate = MIN(источники)
    // - weightedFreshnessRemaining = Σ(freshness × qty) / Σ(qty)
    // - weightedPurchasePrice = Σ(price × qty) / Σ(qty)
    
    // Действия:
    // 1. Создать MixedBatch
    // 2. Уменьшить quantity в исходных BatchLocation
    // 3. Создать BatchLocation для MixedBatch
    // 4. Записать Movement type=MIXING для каждого источника
    // 5. Записать Movement type=MIXING_IN для результата
  }

  /**
   * Получить информацию о составе смешанной партии
   */
  async getMixedBatchComposition(mixedBatchId: string): Promise<MixedBatchComposition>;

  /**
   * Проверить возможность смешивания
   */
  async canMix(sources: BatchSource[]): Promise<MixingValidation>;
}
```

#### Файлы Фазы 10:

- `batch/mixed-batch.schema.ts`
- `operations/mixing/mixing.enums.ts`
- `operations/mixing/mixing.commands.ts`
- `operations/mixing/mixing.queries.ts`
- `operations/mixing/mixing.port.ts`
- `operations/mixing/mixing.service.ts`
- `operations/mixing/mixing.module.ts`
- `operations/mixing/index.ts`

---

## Граф зависимостей модулей (обновлённый)

```
                              ┌─────────────────────┐
                              │ new-inventory.module│
                              └──────────┬──────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│    core/        │           │   orchestrator/ │           │    alerts/      │
│ shelf-life-calc │◀──────────│ inventory.orch  │──────────▶│ expiration-alert│
└─────────────────┘           └────────┬────────┘           └─────────────────┘
                                       │
         ┌─────────────┬───────────────┼───────────────┬─────────────┐
         │             │               │               │             │
         ▼             ▼               ▼               ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  receiving  │ │  transfer   │ │  write-off  │ │   return    │ │    audit    │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │               │
       └───────────────┴───────────────┼───────────────┴───────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
                  ┌─────────────┐             ┌─────────────┐
                  │    batch    │◀────────────│batch-location│
                  └──────┬──────┘             └──────┬──────┘
                         │                           │
                         ▼                           ▼
                  ┌─────────────┐             ┌─────────────┐
                  │  movement   │             │ reservation │
                  └─────────────┘             └─────────────┘
```

---

## Оценка времени

| Фаза | Описание | Дни | Зависимости |
|------|----------|-----|-------------|
| **1** | Ядро (presets, conditions, calculator) | 2-3 | — |
| **2** | Batch + BatchLocation | 3-4 | Фаза 1 |
| **3** | Receiving + Transfer + WriteOff | 4-5 | Фаза 2 |
| **4** | Return | 2-3 | Фаза 3 |
| **5** | Movement + Reservation | 2-3 | Фаза 2 |
| **6** | Audit + Alerts | 2-3 | Фаза 2, 5 |
| **7** | Orchestrator + интеграция | 3-4 | Все фазы |
| **8** | Базовые сущности (ProductTemplate, StorageLocation, Storefront) | 2-3 | Фаза 1 |
| **9** | Ценообразование (Pricing) | 2-3 | Фаза 8 |
| **10** | Смешивание партий (Mixing) | 1-2 | Фаза 2 |

**Итого: 24-33 дня**

---

## Порядок реализации

```
         ┌─────────────────────────────────────────────────────────────┐
         │                    ПАРАЛЛЕЛЬНЫЕ ПОТОКИ                      │
         └─────────────────────────────────────────────────────────────┘

Поток A (Ядро + Сущности):      Поток B (Партии + Операции):
─────────────────────────       ──────────────────────────────

Фаза 1: Ядро                    │
   ↓                            │
Фаза 8: Сущности ───────────────┼───► Фаза 2: Batch + BatchLocation
   ↓                            │        ↓
Фаза 9: Ценообразование         │     Фаза 5: Movement + Reservation
                                │        ↓
                                │     Фаза 3: Receiving + Transfer + WriteOff
                                │        ↓
                                │     Фаза 10: Смешивание
                                │        ↓
                                │     Фаза 4: Return
                                │        ↓
                                │     Фаза 6: Audit + Alerts
                                │        ↓
                                └───► Фаза 7: Orchestrator
```

**Последовательность:**

1. **Фаза 1** → Ядро (core)
2. **Фаза 8** → Базовые сущности (ProductTemplate, StorageLocation, Storefront) — можно параллельно с Фазой 2
3. **Фаза 2** → Batch + BatchLocation
4. **Фаза 9** → Ценообразование — можно параллельно с Фазами 3-5
5. **Фаза 5** → Movement + Reservation
6. **Фаза 3** → Receiving + Transfer + WriteOff
7. **Фаза 10** → Смешивание партий
8. **Фаза 4** → Return
9. **Фаза 6** → Audit + Alerts
10. **Фаза 7** → Orchestrator + финальная интеграция

---

## Миграция данных

После завершения реализации потребуется:

### 1. Автоматическая миграция

```typescript
// scripts/migrate-to-new-inventory.ts
async function migrateToNewInventory(sellerId: string) {
  const session = await connection.startSession();
  
  try {
    await session.withTransaction(async () => {
      // 1. Product → ProductTemplate
      const products = await productModel.find({ owner: sellerId });
      for (const product of products) {
        await productTemplatePort.createFromLegacy({
          legacyProductId: product._id,
          storageConditions: inferStorageConditions(product.category),
        }, { session });
      }
      
      // 2. Shop → StorageLocation + Storefront
      const shops = await shopModel.find({ owner: sellerId });
      for (const shop of shops) {
        const storageLocation = await storageLocationPort.create({
          type: LocationType.SHOP,
          shop: shop._id,
          name: `${shop.shopName} - Склад`,
          temperatureRange: TemperatureRange.ROOM,
        }, { session });
        
        await storefrontPort.create({
          shop: shop._id,
          storageLocation: storageLocation._id,
          products: await migrateShopProducts(shop._id, session),
        }, { session });
      }
      
      // 3. Warehouse → StorageLocation
      const warehouses = await warehouseModel.find({ seller: sellerId });
      for (const warehouse of warehouses) {
        await storageLocationPort.create({
          type: LocationType.WAREHOUSE,
          warehouse: warehouse._id,
          name: warehouse.name,
          temperatureRange: TemperatureRange.COLD, // предполагаем холодильник
        }, { session });
      }
      
      // 4. BatchStock → BatchLocation (если есть данные)
      // ...
    });
  } finally {
    await session.endSession();
  }
}
```

### 2. Маппинг категорий → условия хранения

```typescript
function inferStorageConditions(category: ProductCategory): StorageConditions {
  const mapping: Record<ProductCategory, Partial<StorageConditions>> = {
    [ProductCategory.BERRIES]: {
      preset: StoragePreset.BERRIES,
      baseShelfLifeDays: 7,
      idealTempMin: 0, idealTempMax: 4,
      idealHumidityMin: 90, idealHumidityMax: 95,
      sensitivity: 'HIGH',
    },
    [ProductCategory.FRUITS]: {
      preset: StoragePreset.APPLES_PEARS,
      baseShelfLifeDays: 14,
      idealTempMin: 0, idealTempMax: 4,
      sensitivity: 'MEDIUM',
    },
    [ProductCategory.VEGETABLES]: {
      preset: StoragePreset.ROOT_VEGETABLES,
      baseShelfLifeDays: 21,
      idealTempMin: 2, idealTempMax: 8,
      sensitivity: 'LOW',
    },
    // ... остальные категории
  };
  
  return {
    preset: StoragePreset.GENERIC,
    baseShelfLifeDays: 14,
    sensitivity: 'MEDIUM',
    ...mapping[category],
  };
}
```

---

## Примечания

### Технические требования

- Все операции должны быть транзакционными (MongoDB sessions)
- Movement записывается для КАЖДОГО изменения остатка
- FEFO логика обязательна для всех расходных операций
- Пересчёт сроков происходит при каждом перемещении

### Обратная совместимость

- **Не трогаем старые модули** (Shop, Warehouse, Product, ShopProduct)
- Создаём связи через `legacyProduct`, `shop`, `warehouse` refs
- Старый API продолжает работать через адаптеры
- Постепенно переключаем функционал на новые модули

### Ценообразование

- Цена в `Product.price` остаётся как "рекомендованная"
- Реальные цены живут в `StorefrontProduct.pricing`
- Поддержка разных цен для онлайн/офлайн
- Автоскидки по срокам годности через cron
- Маржинальность рассчитывается от закупочной цены партии

### Смешивание партий

- MixedBatch наследует интерфейс Batch
- Срок = минимальный из источников
- Свежесть и цена = средневзвешенные
- Полная трассируемость состава
- Работает с FEFO как обычная партия

### Управление свежестью (Premium Feature)

- **freshnessManagementEnabled** на уровне Seller, ProductTemplate
- Если выключено → статический срок годности (expirationDate от поставщика)
- Если включено → динамический расчёт (effectiveExpirationDate, freshnessRemaining)
- Платная функция для монетизации

### Собственное производство

- **isHomemade** на уровне ProductTemplate
- HomemadeDetails: рецепт, ингредиенты, время приготовления
- При заказе homemade товара: автоматическое списание ингредиентов (по рецепту)
- shelfLifeAfterPreparationHours — короткий срок жизни после приготовления

---

## Предложения для будущего развития

### 1. 📊 Аналитика потерь (Loss Analytics)

**Зачем:** Понимать, сколько товара списывается, почему, и как это оптимизировать.

```typescript
// Модуль: analytics/loss-analytics
interface LossReport {
  period: { start: Date; end: Date };
  totalLossValue: number;        // Сумма потерь в ₽
  totalLossQuantity: number;     // Количество списанного
  
  byReason: {
    EXPIRED: { quantity: number; value: number };
    DAMAGED: { quantity: number; value: number };
    THEFT: { quantity: number; value: number };
    QUALITY: { quantity: number; value: number };
  };
  
  byCategory: {
    category: ProductCategory;
    quantity: number;
    value: number;
    percentOfTotal: number;
  }[];
  
  recommendations: string[];  // "Рекомендуем уменьшить закупку ягод на 20%"
}
```

**Применение:**
- Отчёты для продавцов с рекомендациями
- Выявление проблемных категорий
- Оптимизация закупок

---

### 2. 🤖 Автозаказ (Auto-Replenishment)

**Зачем:** Автоматически формировать заявки на закупку при достижении минимального остатка.

```typescript
// Уже добавлено в ProductTemplate:
// - reorderPoint: number    // Минимальный остаток для триггера
// - reorderQuantity: number // Рекомендуемый объём заказа
// - defaultSupplier: ObjectId

// Новый модуль: operations/auto-replenishment
interface ReplenishmentSuggestion {
  product: ProductTemplate;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  supplier: Supplier;
  estimatedCost: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Cron-задача: checkReplenishmentNeeds()
// → Формирует список товаров для закупки
// → Группирует по поставщикам
// → Уведомляет продавца или автоматически создаёт заявку
```

**Применение:**
- Предотвращение out-of-stock
- Оптимизация логистики (объединение заказов)
- Прогнозирование расходов

---

### 3. 📈 Прогнозирование спроса (Demand Forecasting)

**Зачем:** Понимать, сколько товара понадобится в будущем.

```typescript
interface DemandForecast {
  product: ProductTemplate;
  period: 'DAY' | 'WEEK' | 'MONTH';
  
  predicted: {
    quantity: number;
    confidence: number; // 0-100%
  };
  
  factors: {
    seasonality: number;    // Влияние сезона
    trend: number;          // Общий тренд
    dayOfWeek: number;      // Влияние дня недели
    promotions: number;     // Влияние акций
  };
  
  history: {
    actual: number[];
    predicted: number[];
  };
}
```

**Применение:**
- Планирование закупок
- Оптимизация запасов
- Предотвращение дефицита

---

### 4. 🏷️ QR-коды для партий (Batch QR Tracking)

**Зачем:** Быстрая идентификация партий в физическом пространстве.

```typescript
interface BatchQR {
  batchId: string;
  qrCode: string;  // Data URL или URL изображения
  
  encodedData: {
    batchNumber: string;
    productName: string;
    expirationDate: Date;
    location: string;
  };
  
  printSettings: {
    size: 'SMALL' | 'MEDIUM' | 'LARGE';
    includeText: boolean;
  };
}

// API: GET /batches/:id/qr-code
// → Генерация QR-кода для печати
// → Сканирование → быстрый доступ к информации о партии
```

**Применение:**
- Инвентаризация через сканирование
- Быстрый поиск партий
- Контроль FEFO в физическом пространстве

---

### 5. 🔌 Интеграция с весами/сканерами (Hardware Integration)

**Зачем:** Автоматизация ввода данных при приёмке и продаже.

```typescript
interface HardwareIntegration {
  // Весы
  scales: {
    connect(port: string): Promise<void>;
    getWeight(): Promise<{ value: number; unit: 'KG' | 'G' }>;
    tare(): Promise<void>;
  };
  
  // Сканер штрих-кодов
  barcodeScanner: {
    onScan(callback: (barcode: string) => void): void;
    lookupProduct(barcode: string): Promise<ProductTemplate | null>;
  };
  
  // Термопринтер для этикеток
  labelPrinter: {
    printBatchLabel(batch: Batch): Promise<void>;
    printPriceTag(product: StorefrontProduct): Promise<void>;
  };
}
```

**Применение:**
- Ускорение приёмки товара
- Автоматическое взвешивание
- Печать ценников и этикеток

---

### 6. 📱 Мобильное приложение для склада (Warehouse Mobile App)

**Зачем:** Управление складом с телефона/планшета.

```
Функционал:
├── Сканирование штрих-кодов
├── Приёмка товара
├── Перемещение между локациями
├── Инвентаризация
├── Просмотр остатков
├── Алерты по срокам
└── Быстрое списание
```

---

### 7. 🌡️ IoT-датчики температуры (Temperature Monitoring)

**Зачем:** Автоматическое отслеживание условий хранения.

```typescript
interface TemperatureSensor {
  sensorId: string;
  location: StorageLocation;
  
  currentReading: {
    temperature: number;
    humidity: number;
    timestamp: Date;
  };
  
  alerts: {
    type: 'TEMP_HIGH' | 'TEMP_LOW' | 'HUMIDITY_HIGH' | 'HUMIDITY_LOW';
    threshold: number;
    enabled: boolean;
  }[];
  
  history: {
    timestamp: Date;
    temperature: number;
    humidity: number;
  }[];
}

// При выходе за пределы → автоматический пересчёт сроков
// → Уведомление продавцу
// → Рекомендация действий
```

**Применение:**
- Реальный контроль условий хранения
- Автоматический пересчёт сроков при нарушении условий
- Доказательная база для претензий

---

### 8. 🧾 Интеграция с 1С (1C Integration)

**Зачем:** Синхронизация с учётной системой продавца.

```typescript
interface Integration1C {
  // Импорт
  importProducts(data: Product1C[]): Promise<void>;
  importBatches(data: Batch1C[]): Promise<void>;
  importPrices(data: Price1C[]): Promise<void>;
  
  // Экспорт
  exportSales(period: DateRange): Promise<Sale1C[]>;
  exportWriteOffs(period: DateRange): Promise<WriteOff1C[]>;
  exportMovements(period: DateRange): Promise<Movement1C[]>;
  
  // Синхронизация
  sync(options: { full: boolean }): Promise<SyncResult>;
}
```

---

### 9. 🎁 Комплекты и наборы (Product Bundles)

**Зачем:** Продажа наборов как единого товара (подарочная корзина, набор для смузи).

```typescript
@Schema({ _id: false })
export class BundleDetails {
  /** Позиции набора */
  @Prop({ type: [BundleItemSchema], required: true })
  items: BundleItem[];
  
  /** Автоматическая сборка при заказе? */
  @Prop({ type: Boolean, default: true })
  autoAssemble: boolean;
  
  /** Фиксированная цена набора (или null = сумма позиций) */
  @Prop({ type: Number })
  fixedPrice?: number;
  
  /** Скидка на набор % */
  @Prop({ type: Number })
  bundleDiscount?: number;
}

@Schema({ _id: false })
export class BundleItem {
  @Prop({ type: Types.ObjectId, ref: 'ProductTemplate', required: true })
  product: Types.ObjectId;
  
  @Prop({ type: Number, min: 0, required: true })
  quantity: number;
  
  /** Можно заменить на другой товар? */
  @Prop({ type: Boolean, default: false })
  substitutable: boolean;
  
  /** Альтернативы для замены */
  @Prop({ type: [Types.ObjectId], ref: 'ProductTemplate' })
  alternatives?: Types.ObjectId[];
}
```

---

### 10. 📋 Чек-листы для сотрудников (Staff Checklists)

**Зачем:** Стандартизация операций (открытие смены, закрытие, приёмка).

```typescript
interface Checklist {
  type: 'SHIFT_OPEN' | 'SHIFT_CLOSE' | 'RECEIVING' | 'INVENTORY' | 'CUSTOM';
  shop: Shop;
  
  items: {
    order: number;
    task: string;
    required: boolean;
    completed: boolean;
    completedAt?: Date;
    completedBy?: Employee;
    note?: string;
    photo?: Image; // Фото подтверждение
  }[];
  
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

// Примеры чек-листов:
// - Открытие: проверить температуру холодильника, выложить товар, проверить сроки
// - Закрытие: убрать скоропорт, протереть витрины, сформировать отчёт
// - Приёмка: проверить документы, осмотреть товар, проверить сроки
```

---

### Приоритеты реализации

**✅ ВКЛЮЧЕНЫ В ОСНОВНОЙ ПЛАН (Фазы 11-13):**

| Фаза | Функция | Срок | Сложность | Бизнес-ценность |
|------|---------|------|-----------|-----------------|
| **Фаза 11** | 🏷️ QR-коды для партий | 1-2 дня | Низкая | Средняя |
| **Фаза 12** | 📊 Аналитика потерь | 2-3 дня | Средняя | Высокая |
| **Фаза 13** | 📈 Прогнозирование спроса | 3-4 дня | Средняя | Высокая |

**📋 БУДУЩИЕ РАСШИРЕНИЯ:**

| # | Функция | Приоритет | Сложность | Бизнес-ценность |
|---|---------|-----------|-----------|-----------------|
| 1 | Автозаказ | 🔴 Высокий | Средняя | Высокая |
| 2 | Комплекты и наборы | 🟡 Средний | Средняя | Высокая |
| 3 | Мобильное приложение | 🟡 Средний | Высокая | Высокая |
| 4 | Интеграция с 1С | 🟢 Низкий | Высокая | Средняя |
| 5 | IoT-датчики | 🟢 Низкий | Высокая | Средняя |
| 6 | Hardware Integration | 🟢 Низкий | Высокая | Средняя |
| 7 | Чек-листы | 🟢 Низкий | Низкая | Низкая |

---

## Фазы 11-13: QR-коды, Аналитика, Прогнозирование

### Фаза 11: QR-коды для партий (1-2 дня)

**Цель:** Быстрая идентификация партий через QR-коды.

```typescript
// qr/batch-qr.service.ts
@Injectable()
export class BatchQRService {
  /**
   * Генерирует QR-код для партии
   */
  generateQRCode(batch: Batch): Promise<QRCodeResult>;
  
  /**
   * Декодирует QR-код и возвращает информацию о партии
   */
  decodeQRCode(qrData: string): Promise<BatchInfo | null>;
  
  /**
   * Генерирует этикетку с QR-кодом для печати
   */
  generateLabel(batch: Batch, options: LabelOptions): Promise<Buffer>;
}

interface QRCodeResult {
  dataUrl: string;           // Base64 изображение
  rawData: string;           // Закодированные данные
  encodedInfo: {
    batchNumber: string;
    productName: string;
    expirationDate: Date;
    quantity: number;
    location: string;
  };
}

interface LabelOptions {
  size: 'SMALL' | 'MEDIUM' | 'LARGE';  // 40x30, 60x40, 100x60 мм
  includeText: boolean;
  includePrice: boolean;
  includeExpiration: boolean;
}
```

**API:**
- `GET /batches/:id/qr-code` — получить QR-код
- `GET /batches/:id/label` — получить этикетку для печати
- `POST /batches/scan` — отсканировать QR и получить информацию

---

### Фаза 12: Аналитика потерь (2-3 дня)

**Цель:** Отчёты о списаниях с рекомендациями.

```typescript
// analytics/loss-analytics.service.ts
@Injectable()
export class LossAnalyticsService {
  /**
   * Отчёт о потерях за период
   */
  getLossReport(input: {
    sellerId: string;
    shopId?: string;
    period: { start: Date; end: Date };
  }): Promise<LossReport>;
  
  /**
   * Топ проблемных товаров
   */
  getTopLossProducts(input: {
    sellerId: string;
    limit: number;
    period: { start: Date; end: Date };
  }): Promise<ProductLossStat[]>;
  
  /**
   * Рекомендации по оптимизации
   */
  getRecommendations(sellerId: string): Promise<Recommendation[]>;
}

interface LossReport {
  period: { start: Date; end: Date };
  totalLossValue: number;        // Сумма потерь в ₽
  totalLossQuantity: number;     // Количество списанного
  
  byReason: Record<WriteOffReason, { quantity: number; value: number }>;
  
  byProductType: {
    productType: ProductType;
    quantity: number;
    value: number;
    percentOfTotal: number;
  }[];
  
  byShop?: {
    shopId: string;
    shopName: string;
    totalLoss: number;
  }[];
  
  trend: {
    previousPeriod: number;
    currentPeriod: number;
    changePercent: number;
  };
}

interface Recommendation {
  type: 'REDUCE_ORDER' | 'CHANGE_SUPPLIER' | 'IMPROVE_STORAGE' | 'PRICE_ADJUSTMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  product?: ProductTemplate;
  message: string;
  potentialSavings?: number;
}
```

**API:**
- `GET /analytics/losses` — отчёт о потерях
- `GET /analytics/losses/top-products` — топ проблемных товаров
- `GET /analytics/losses/recommendations` — рекомендации

---

### Фаза 13: Прогнозирование спроса (3-4 дня)

**Цель:** Предсказание спроса на основе истории продаж.

```typescript
// analytics/demand-forecast.service.ts
@Injectable()
export class DemandForecastService {
  /**
   * Прогноз спроса на товар
   */
  getForecast(input: {
    productId: string;
    shopId: string;
    period: 'DAY' | 'WEEK' | 'MONTH';
    horizonDays: number;  // На сколько дней вперёд
  }): Promise<DemandForecast>;
  
  /**
   * Рекомендации по закупкам
   */
  getPurchaseRecommendations(input: {
    shopId: string;
    daysAhead: number;
  }): Promise<PurchaseRecommendation[]>;
}

interface DemandForecast {
  product: ProductTemplate;
  shop: Shop;
  
  predictions: {
    date: Date;
    predictedQuantity: number;
    confidence: number;  // 0-100%
    lowerBound: number;
    upperBound: number;
  }[];
  
  factors: {
    seasonality: number;    // Влияние сезона
    trend: number;          // Общий тренд (+/-)
    dayOfWeek: number;      // Влияние дня недели
    weather?: number;       // Влияние погоды (если подключено)
  };
  
  accuracy: {
    mape: number;  // Mean Absolute Percentage Error
    lastPredictions: { predicted: number; actual: number; date: Date }[];
  };
}

interface PurchaseRecommendation {
  product: ProductTemplate;
  currentStock: number;
  predictedDemand: number;  // За период
  recommendedOrder: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supplier?: Supplier;
  estimatedCost: number;
}
```

**API:**
- `GET /analytics/forecast/:productId` — прогноз по товару
- `GET /analytics/forecast/shop/:shopId` — прогноз по магазину
- `GET /analytics/purchase-recommendations` — рекомендации по закупкам

---

### Итоговая оценка времени

| Фаза | Описание | Оценка |
|------|----------|--------|
| 1 | Ядро системы | 2-3 дня |
| 2 | Партии и остатки | 3-4 дня |
| 3 | Операции (приёмка, перемещение, списание) | 3-4 дня |
| 4 | Возвраты | 2-3 дня |
| 5 | Движения и резервирование | 2-3 дня |
| 6 | Инвентаризация и алерты | 2-3 дня |
| 7 | Orchestrator | 2-3 дня |
| 8 | Базовые сущности (ProductTemplate, StorageLocation, Storefront) | 2-3 дня |
| 9 | Ценообразование | 2-3 дня |
| 10 | Смешивание партий | 1-2 дня |
| **11** | **QR-коды для партий** | **1-2 дня** |
| **12** | **Аналитика потерь** | **2-3 дня** |
| **13** | **Прогнозирование спроса** | **3-4 дня** |
| **Итого** | | **~28-38 дней** |
