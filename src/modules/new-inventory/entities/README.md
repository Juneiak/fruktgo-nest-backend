# Entities — Сущности

Основные сущности: что храним, где храним, что продаём.

---

## Зачем 4 разные сущности?

Представь магазин фруктов:

1. **InventoryProduct** — "Яблоко Голден" (что это за товар вообще)
2. **ProductTemplate** — "Мои настройки для яблок" (как я работаю с этим товаром)
3. **StorageLocation** — "Холодильник №1" (где лежит)
4. **Storefront** — "Витрина в приложении" (что видит покупатель)

---

## Структура

```
entities/
├── inventory-product/   # Продукт
├── product-template/    # Настройки продавца
├── storage-location/    # Локация хранения
├── storefront/          # Витрина
└── index.ts
```

---

## InventoryProduct — Продукт

**Что это:** Карточка товара со всеми характеристиками для складского учёта.

### Пример

```
Яблоко Голден
├── Категория: Фрукты
├── Единица: КГ
├── Хранение: 0-4°C (пресет APPLES_PEARS)
├── Срок годности: 30 дней
├── Усушка: 0.5% в день
├── Допуск веса: ±10%
└── Штрих-код: 4601234567890
```

### Поля

```typescript
InventoryProduct {
  // Основное
  seller,                   // Чей продукт
  name,                     // "Яблоко Голден"
  description,              // Описание
  sku,                      // Артикул
  barcodes,                 // Штрих-коды
  
  // Категория
  category,                 // FRUITS, VEGETABLES, DAIRY...
  subcategory,              // "Яблоки"
  unit,                     // KG, PCS, G, L, PACK
  
  // Хранение
  storageRequirements: {
    preset,                 // APPLES_PEARS
    minTemperature,         // 0°C
    maxTemperature,         // 4°C
    requiresRefrigeration,  // true
  },
  
  // Срок годности
  shelfLife: {
    type,                   // PERISHABLE (скоропорт)
    baseDays,               // 30 дней
    minDaysForReceiving,    // Минимум 7 дней при приёмке
  },
  
  // Усушка (для овощей/фруктов)
  shrinkage: {
    enabled,                // true
    percentPerDay,          // 0.5%
    maxPercent,             // 10%
  },
  
  // Допуск веса
  tolerance: {
    enabled,                // true
    percent,                // 0.1 (±10%)
  },
  
  // Фото
  imageUrl,
  gallery,
  
  // Статус
  status,                   // ACTIVE, INACTIVE, ARCHIVED
}
```

### Когда используется

```
Создаём партию → берём срок из InventoryProduct
Рассчитываем деградацию → берём условия из InventoryProduct
Считаем усушку → берём процент из InventoryProduct
```

---

## ProductTemplate — Настройки продавца

**Что это:** Как продавец хочет работать с этим товаром (цены, автозаказ, переопределения).

### Зачем отдельно от InventoryProduct?

```
InventoryProduct = ЧТО это за товар (факты)
ProductTemplate = КАК я с ним работаю (настройки)
```

Один продукт — разные настройки у разных магазинов:

```
"Яблоко Голден" (InventoryProduct)
    │
    ├── Магазин А (ProductTemplate)
    │   ├── Наценка: 25%
    │   ├── Автозаказ: при < 5 кг
    │   └── Поставщик: ООО "Сады"
    │
    └── Магазин Б (ProductTemplate)
        ├── Наценка: 40%
        ├── Автозаказ: при < 20 кг
        └── Поставщик: ИП Иванов
```

### Поля

```typescript
ProductTemplate {
  seller,
  product,                  // → InventoryProduct
  
  // Переопределение хранения
  storageSettings: {
    preset,                 // Можно сменить пресет
    customShelfLifeDays,    // Свой срок (если отличается)
    shrinkageEnabled,
  },
  
  // Ценообразование
  pricingSettings: {
    baseOnlinePrice,        // 120₽
    baseOfflinePrice,       // 120₽
    minMarkupPercent,       // 20% минимум
    purchasePriceStrategy,  // LAST / WEIGHTED_AVERAGE / FIFO
    autoExpirationDiscounts, // Автоскидки по сроку
  },
  
  // Допуск веса
  toleranceSettings: {
    weightTolerance,        // 0.1 (±10%)
  },
  
  // Автозаказ
  autoReorder: {
    enabled,
    reorderPoint,           // При каком остатке заказывать
    reorderQuantity,        // Сколько заказывать
    preferredSupplier,
  },
  
  // SKU и штрих-коды продавца
  sku,
  barcodes,
}
```

---

## StorageLocation — Локация хранения

**Что это:** Место, где лежит товар (холодильник, склад, витрина).

### Примеры

```
Магазин "Фрукты у дома"
├── Холодильник №1 (0-4°C)
│   ├── Зона молочки
│   └── Зона фруктов
├── Холодильник №2 (0-4°C)
├── Морозильник (-18°C)
├── Витрина (18-22°C)
└── Подсобка (комната)

Склад "Центральный"
├── Холодильная камера (2-4°C)
├── Морозильная камера (-18°C)
└── Сухой склад (18°C)
```

### Вложенность

Локации могут быть вложенными:

```
Склад (StorageLocation)
└── Холодильник (StorageLocation, parent: Склад)
    └── Полка №3 (StorageLocation, parent: Холодильник)
```

### Поля

```typescript
StorageLocation {
  seller,
  name,                     // "Холодильник №1"
  
  // Тип
  type,                     // SHOP или WAREHOUSE
  locationType,             // FREEZER, REFRIGERATOR, ROOM, DISPLAY
  
  // Вложенность
  parent,                   // Родительская локация
  
  // Условия
  targetConditions: {       // Какие должны быть
    temperature,            // 3°C
    humidity,               // 85%
  },
  
  actualConditions: {       // Какие сейчас
    temperature,            // 4°C
    humidity,               // 82%
    measuredAt,             // Когда измерено
    source,                 // SENSOR или MANUAL
  },
  
  // Связь
  shop,                     // Если тип SHOP
  warehouse,                // Если тип WAREHOUSE
  
  capacity,                 // Вместимость
  isActive,
}
```

### Типы локаций

| Тип | Температура | Для чего |
|-----|-------------|----------|
| `FREEZER` | -18°C | Заморозка |
| `REFRIGERATOR` | 0-4°C | Молочка, мясо, фрукты |
| `COOL_ROOM` | 8-12°C | Тропические фрукты, некоторые овощи |
| `ROOM` | 18-22°C | Бакалея, хлеб |
| `DISPLAY` | Разная | Витрина для покупателей |

---

## Storefront — Витрина

**Что это:** То, что видит покупатель в приложении — товары с ценами.

### Структура

```
Storefront (витрина магазина)
├── Магазин: "Фрукты у дома"
├── Название: "Основная витрина"
└── Товары:
    ├── StorefrontProduct: Яблоки (120₽/кг)
    ├── StorefrontProduct: Бананы (90₽/кг)
    └── StorefrontProduct: Молоко (80₽/л)
```

### StorefrontProduct — Товар на витрине

```typescript
StorefrontProduct {
  product,                  // → InventoryProduct
  
  // Цены
  onlinePrice,              // Цена в приложении
  offlinePrice,             // Цена на кассе
  
  // Скидки
  discounts: [{
    type,                   // PERCENT или FIXED
    value,                  // 20 (%)
    reason,                 // EXPIRATION, PROMO, MANUAL
    validUntil,             // До какого числа
  }],
  
  // Видимость
  isVisible,                // Показывать в каталоге
  isAvailable,              // Есть в наличии (автоматически)
}
```

### Откуда берётся `isAvailable`?

```
isAvailable = есть хотя бы один BatchLocation с quantity > 0

НЕ хранится отдельно!
Считается динамически из BatchLocation.
```

---

## Как всё связано

```
InventoryProduct (что за товар)
       │
       ├──→ ProductTemplate (настройки продавца)
       │
       ├──→ Batch (партии этого товара)
       │       │
       │       └──→ BatchLocation (где лежит партия)
       │               │
       │               └──→ StorageLocation (локация)
       │
       └──→ StorefrontProduct (на витрине)
               │
               └──→ Storefront → Shop
```

### Пример: путь яблока

```
1. Создали InventoryProduct "Яблоко Голден"
   ├── Категория: FRUITS
   ├── Пресет: APPLES_PEARS
   └── Срок: 30 дней

2. Создали ProductTemplate
   ├── Наценка: 25%
   └── Автозаказ: при < 10 кг

3. Приняли партию → Batch
   ├── 100 кг
   └── Срок до 20.12

4. Положили в холодильник → BatchLocation
   ├── Локация: Холодильник №1 (StorageLocation)
   └── Количество: 100 кг

5. Добавили на витрину → StorefrontProduct
   ├── Цена: 120₽/кг
   └── isAvailable: true (есть остаток)
```

---

## Использование

```typescript
import {
  // InventoryProduct
  INVENTORY_PRODUCT_PORT,
  InventoryProductPort,
  InventoryProduct,
  InventoryProductCommands,
  InventoryProductQueries,
  ProductCategory,
  ProductUnit,
  
  // ProductTemplate
  PRODUCT_TEMPLATE_PORT,
  ProductTemplatePort,
  
  // StorageLocation
  STORAGE_LOCATION_PORT,
  StorageLocationPort,
  StorageLocation,
  StorageLocationType,
  
  // Storefront
  STOREFRONT_PORT,
  StorefrontPort,
  Storefront,
  StorefrontProduct,
} from 'src/modules/new-inventory/entities';
```

### Пример: создать продукт

```typescript
const product = await productPort.create(
  new InventoryProductCommands.CreateInventoryProductCommand({
    seller: sellerId,
    name: 'Яблоко Голден',
    category: ProductCategory.FRUITS,
    unit: ProductUnit.KG,
    storageRequirements: {
      preset: StoragePreset.APPLES_PEARS,
    },
    shelfLife: {
      type: ShelfLifeType.PERISHABLE,
      baseDays: 30,
    },
    tolerance: {
      enabled: true,
      percent: 0.1,
    },
  }),
);
```

---

## Файлы

```
entities/
├── inventory-product/
│   ├── inventory-product.schema.ts
│   ├── inventory-product.enums.ts
│   ├── inventory-product.commands.ts
│   ├── inventory-product.queries.ts
│   ├── inventory-product.port.ts
│   ├── inventory-product.service.ts
│   ├── inventory-product.module.ts
│   └── index.ts
│
├── product-template/
│   └── ... (аналогично)
│
├── storage-location/
│   └── ... (аналогично)
│
├── storefront/
│   └── ... (аналогично)
│
└── index.ts
```
