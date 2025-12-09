# Фаза 1: Базовые сущности + Ядро

> **Срок:** 4-5 дней  
> **Зависимости:** Нет (первая фаза)

---

## Что делаем в этой фазе

Создаём **фундамент** всей складской системы:

1. **Ядро расчётов** — как считать сроки годности
2. **ProductTemplate** — шаблон товара (замена старого Product)
3. **StorageLocation** — где храним товар (склад или магазин)
4. **Storefront** — витрина магазина
5. **StorefrontProduct** — товар на витрине с ценами

---

## Зачем это нужно (простыми словами)

Представь, что ты открываешь магазин фруктов:

1. **ProductTemplate** — это "каталог товаров". Тут написано: "Клубника — ягода, хранить при 0-4°C, портится за 7 дней в идеальных условиях"

2. **StorageLocation** — это "места хранения". У тебя есть холодильник в магазине (4°C) и подсобка (комнатная температура)

3. **Storefront** — это "витрина твоего магазина". Что клиент видит, когда заходит

4. **StorefrontProduct** — это "ценник на витрине". Клубника по 300₽/кг онлайн, 280₽/кг в магазине

---

## Порядок разработки

### Шаг 1: Ядро расчётов (core/)

#### 1.1 Storage Presets — пресеты для разных категорий

**Что это:** Разные продукты по-разному реагируют на температуру. Клубника в тепле портится за 2 дня, а яблоки — за неделю.

**Файлы:**
- `core/storage-preset/storage-preset.enums.ts` — список пресетов
- `core/storage-preset/storage-preset.config.ts` — коэффициенты для каждого пресета

**Пресеты:**
```
BERRIES      — ягоды (очень чувствительны)
STONE_FRUITS — косточковые (персики, сливы)
CITRUS       — цитрусовые (живучие)
APPLES_PEARS — яблоки, груши
TROPICAL     — тропические (бананы не любят холод!)
LEAFY_GREENS — зелень (вянет моментально)
ROOT_VEGETABLES — морковь, картошка
TOMATOES     — помидоры
MUSHROOMS    — грибы
GENERIC      — всё остальное
```

**Коэффициенты:**
- `< 1.0` — товар портится медленнее (холодильник)
- `= 1.0` — нормальная скорость (комнатная температура)
- `> 1.0` — товар портится быстрее (жара)

**Пример:**
```
Клубника (BERRIES):
- В холодильнике (0-4°C): коэффициент 0.4 → портится в 2.5 раза медленнее
- В прохладе (10-15°C): коэффициент 0.8
- В комнате (18-22°C): коэффициент 1.5 → портится в 1.5 раза быстрее
- В жаре (>25°C): коэффициент 3.0 → портится в 3 раза быстрее
```

#### 1.2 Storage Conditions — условия хранения

**Что это:** Описание идеальных условий для товара.

**Файлы:**
- `core/storage-conditions/storage-conditions.schema.ts`

**Поля:**
```
idealTempMin: number     // Идеальная температура от (°C)
idealTempMax: number     // Идеальная температура до (°C)
idealHumidityMin: number // Идеальная влажность от (%)
idealHumidityMax: number // Идеальная влажность до (%)
baseShelfLifeDays: number // Срок годности в идеальных условиях
preset: StoragePreset    // Какой пресет использовать
sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' // Чувствительность
```

**Пример для клубники:**
```
idealTempMin: 0
idealTempMax: 4
idealHumidityMin: 90
idealHumidityMax: 95
baseShelfLifeDays: 7
preset: BERRIES
sensitivity: HIGH
```

#### 1.3 Shelf Life Calculator — калькулятор сроков

**Что это:** Сервис, который считает, когда товар испортится.

**Файлы:**
- `core/shelf-life-calculator/shelf-life-calculator.service.ts`

**Методы:**
```typescript
// Получить коэффициент деградации для условий
calculateDegradationCoefficient(preset, temperature, humidity): number

// Сколько "свежести" потратилось за время в локации
calculateFreshnessConsumed(freshnessRemaining, hoursInLocation, coefficient): number

// Новый срок годности при перемещении
calculateNewExpirationDate(freshnessRemaining, newCoefficient, moveDate): Date
```

**Пример расчёта:**
```
Клубника попала на склад-холодильник:
- Базовый срок: 7 дней
- Коэффициент холодильника: 0.4
- Реальный срок: 7 / 0.4 = 17.5 дней

Через 3 дня перевезли в магазин (комната):
- Потрачено свежести: 3 * 0.4 = 1.2 дня
- Осталось: 7 - 1.2 = 5.8 дней свежести
- Коэффициент магазина: 1.5
- Осталось реального времени: 5.8 / 1.5 = 3.9 дня
```

---

### Шаг 2: ProductTemplate (замена Product)

**Что это:** Полноценная карточка товара со всеми характеристиками.

**Важно:** Это НЕ расширение старого Product, это ЗАМЕНА. ProductTemplate — самостоятельная сущность.

**Файлы:**
- `entities/product-template/product-template.schema.ts`
- `entities/product-template/product-template.enums.ts`
- `entities/product-template/product-template.port.ts`
- `entities/product-template/product-template.service.ts`
- `entities/product-template/product-template.module.ts`

**Основные поля:**

```typescript
// Кому принадлежит
seller: ObjectId          // Продавец-владелец

// Основная информация
name: string              // "Клубника свежая"
sku: string               // "BERRY-STRAWBERRY-001"
category: ProductCategory // FRUITS, VEGETABLES, BERRIES...
productType: ProductType  // PERISHABLE, SHELF_STABLE, FROZEN...
measuringScale: MeasuringScale // KILOGRAM, PIECE, LITER...
description: string
image: ObjectId

// Условия хранения (используются калькулятором)
storageConditions: StorageConditions

// Управление свежестью (Premium функция)
freshnessManagementEnabled: boolean

// Для товаров без управления свежестью
defaultShelfLifeDays: number

// Собственное производство (смузи, нарезка)
isHomemade: boolean
homemadeDetails: {
  recipe: string
  ingredients: [{ product, quantity }]
  preparationTime: number
  shelfLifeAfterPreparationHours: number
}

// КБЖУ
nutrition: {
  calories: number
  proteins: number
  fats: number
  carbohydrates: number
}

// Категорийные расширения (для мяса — халяль, для молочки — жирность)
categoryExtensions: CategoryExtensions

// Рекомендованная цена (справочная)
recommendedRetailPrice: number

status: 'ACTIVE' | 'ARCHIVED'
```

**Типы товаров (ProductType):**
```
PERISHABLE    — скоропортящиеся (фрукты, овощи, ягоды)
SHELF_STABLE  — длительного хранения (консервы, крупы)
FROZEN        — замороженные
BAKERY        — выпечка
MEAT          — мясо/птица
SEAFOOD       — рыба/морепродукты
DAIRY         — молочные продукты
BEVERAGES     — напитки
NON_FOOD      — непищевые (упаковка, посуда)
```

---

### Шаг 3: StorageLocation (где храним)

**Что это:** Место хранения товара — склад или магазин с его условиями.

**Файлы:**
- `entities/storage-location/storage-location.schema.ts`
- `entities/storage-location/storage-location.enums.ts`
- `entities/storage-location/storage-location.port.ts`
- `entities/storage-location/storage-location.service.ts`
- `entities/storage-location/storage-location.module.ts`

**Основные поля:**

```typescript
seller: ObjectId          // Владелец
type: 'SHOP' | 'WAREHOUSE' // Тип локации
shop: ObjectId            // Ссылка на Shop (если тип SHOP)
warehouse: ObjectId       // Ссылка на Warehouse (если тип WAREHOUSE)
name: string              // "Холодильник в магазине на Ленина"

// Тип зоны
zoneType: StorageZoneType // FREEZER, REFRIGERATOR, ROOM_TEMP...

// Вложенность (например: Склад → Холодильник → Полка)
parentLocation: ObjectId

// Условия хранения
conditionsMode: 'MANUAL' | 'DYNAMIC' // Ручной ввод или датчики
currentConditions: {
  temperature: number
  humidity: number
  measuredAt: Date
  source: 'MANUAL' | 'SENSOR'
}

// Целевые условия (для контроля)
targetTempMin: number
targetTempMax: number

// Расчётные поля
temperatureRange: TemperatureRange // COLD, COOL, ROOM, WARM
defaultDegradationCoefficient: number // Коэффициент для этой локации

status: 'ACTIVE' | 'INACTIVE'
```

**Типы зон (StorageZoneType):**
```
FREEZER      — морозильник (-18°C)
REFRIGERATOR — холодильник (0-4°C)
COOL_ROOM    — прохладная комната (10-15°C)
ROOM_TEMP    — комнатная температура (18-22°C)
SHOWCASE     — витрина (открытая выкладка)
BACKROOM    — подсобка
```

**Пример структуры:**
```
Магазин "На Ленина"
├── Торговый зал (ROOM_TEMP, 22°C)
├── Холодильная витрина (REFRIGERATOR, 4°C)
├── Морозильник (FREEZER, -18°C)
└── Подсобка (BACKROOM, 20°C)
```

---

### Шаг 4: Storefront (витрина магазина)

**Что это:** Витрина конкретного магазина. Один магазин = одна витрина.

**Файлы:**
- `entities/storefront/storefront.schema.ts`
- `entities/storefront/storefront.port.ts`
- `entities/storefront/storefront.service.ts`
- `entities/storefront/storefront.module.ts`

**Основные поля:**

```typescript
seller: ObjectId         // Владелец
shop: ObjectId           // Магазин (1:1 связь)
storageLocation: ObjectId // Основная локация хранения

// Настройки витрины
isOnlineEnabled: boolean  // Включены онлайн-заказы
isOfflineEnabled: boolean // Включены офлайн-продажи

// Ссылки на товары на витрине
products: ObjectId[]     // Массив StorefrontProduct

status: 'ACTIVE' | 'INACTIVE'
```

**Связи:**
```
Shop (1) ──────► Storefront (1)
                    │
                    ├──► StorefrontProduct (many)
                    │
                    └──► StorageLocation (1)
```

---

### Шаг 5: StorefrontProduct (товар на витрине)

**Что это:** Конкретный товар на витрине конкретного магазина с его ценами.

**Важно:** StorefrontProduct — отдельная коллекция, НЕ вложенный документ в Storefront.

**Файлы:**
- `entities/storefront-product/storefront-product.schema.ts`
- `entities/storefront-product/storefront-product.port.ts`
- `entities/storefront-product/storefront-product.service.ts`
- `entities/storefront-product/storefront-product.module.ts`

**Основные поля:**

```typescript
storefront: ObjectId     // На какой витрине
productTemplate: ObjectId // Какой товар (ProductTemplate)

// Видимость
isVisible: boolean       // Показывать на витрине

// Ценообразование
pricing: {
  purchasePrice: number    // Закупочная (из последней партии)
  onlinePrice: number      // Цена онлайн
  offlinePrice: number     // Цена офлайн (может отличаться)
  
  wholesale: {             // Оптовая цена
    minQuantity: number
    price: number
  }
  
  discount: {              // Скидка
    type: 'PERCENT' | 'FIXED'
    value: number
    reason: DiscountReason
    startsAt: Date
    endsAt: Date
  }
}

// Живые фотографии с витрины
livePhotos: [{
  image: ObjectId
  takenAt: Date
  takenBy: ObjectId
  caption: string
}]

// Статистика продаж
statistics: {
  totalSold: number
  totalRevenue: number
  averageRating: number
}

status: 'ACTIVE' | 'OUT_OF_STOCK' | 'HIDDEN'
```

**Причины скидок (DiscountReason):**
```
EXPIRING_SOON  — скоро истекает срок
RETURNED_ITEM  — возврат
PROMOTION      — акция
CLEARANCE      — распродажа
DAMAGED        — повреждённая упаковка
MANUAL         — ручная скидка
```

---

## Структура файлов после Фазы 1

```
src/modules/new-inventory/
├── core/
│   ├── storage-preset/
│   │   ├── storage-preset.enums.ts
│   │   ├── storage-preset.config.ts
│   │   └── index.ts
│   │
│   ├── storage-conditions/
│   │   ├── storage-conditions.schema.ts
│   │   └── index.ts
│   │
│   ├── shelf-life-calculator/
│   │   ├── shelf-life-calculator.service.ts
│   │   ├── shelf-life-calculator.module.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── entities/
│   ├── product-template/
│   │   ├── product-template.schema.ts
│   │   ├── product-template.enums.ts
│   │   ├── product-template.commands.ts
│   │   ├── product-template.queries.ts
│   │   ├── product-template.port.ts
│   │   ├── product-template.service.ts
│   │   ├── product-template.module.ts
│   │   └── index.ts
│   │
│   ├── storage-location/
│   │   ├── storage-location.schema.ts
│   │   ├── storage-location.enums.ts
│   │   ├── storage-location.commands.ts
│   │   ├── storage-location.queries.ts
│   │   ├── storage-location.port.ts
│   │   ├── storage-location.service.ts
│   │   ├── storage-location.module.ts
│   │   └── index.ts
│   │
│   ├── storefront/
│   │   ├── storefront.schema.ts
│   │   ├── storefront.enums.ts
│   │   ├── storefront.commands.ts
│   │   ├── storefront.queries.ts
│   │   ├── storefront.port.ts
│   │   ├── storefront.service.ts
│   │   ├── storefront.module.ts
│   │   └── index.ts
│   │
│   ├── storefront-product/
│   │   ├── storefront-product.schema.ts
│   │   ├── storefront-product.enums.ts
│   │   ├── storefront-product.commands.ts
│   │   ├── storefront-product.queries.ts
│   │   ├── storefront-product.port.ts
│   │   ├── storefront-product.service.ts
│   │   ├── storefront-product.module.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
└── index.ts
```

---

## Чек-лист готовности

- [ ] Storage Presets — все пресеты и коэффициенты
- [ ] Storage Conditions — схема условий хранения
- [ ] Shelf Life Calculator — сервис с тестами
- [ ] ProductTemplate — полная схема, порт, сервис
- [ ] StorageLocation — схема с зонами, порт, сервис
- [ ] Storefront — схема, порт, сервис
- [ ] StorefrontProduct — схема с ценами, порт, сервис
- [ ] Все модули зарегистрированы и экспортируются
- [ ] Базовые тесты для калькулятора

---

## Результат Фазы 1

После завершения можно:
1. Создать ProductTemplate (карточку товара)
2. Создать StorageLocation (склад/магазин с условиями)
3. Создать Storefront для магазина
4. Добавить товар на витрину (StorefrontProduct) с ценами
5. Рассчитать, как быстро товар испортится в разных условиях

**Чего ещё нельзя:**
- Принимать товар (нет партий)
- Отслеживать остатки (нет BatchLocation)
- Перемещать товар (нет Transfer)

Это делаем в Фазе 2 и Фазе 3.
