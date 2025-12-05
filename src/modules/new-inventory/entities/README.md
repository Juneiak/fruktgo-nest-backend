# Entities

Базовые сущности складского учёта.

## Структура

```
entities/
├── inventory-product/   # Продукт (что хранится)
├── product-template/    # Шаблон настроек продавца
├── storage-location/    # Локация хранения (где хранится)
├── storefront/          # Витрина магазина (что продаётся)
└── index.ts
```

## InventoryProduct

**Что это:** Продукт в каталоге продавца со всеми характеристиками для складского учёта.

```typescript
InventoryProduct {
  seller,                   // Владелец
  name, description, sku,   // Основная информация
  category,                 // FRUITS, VEGETABLES, DAIRY, MEAT...
  unit,                     // KG, PCS, G, L, PACK
  
  storageRequirements: {    // Условия хранения
    preset,                 // StoragePreset
    minTemperature, maxTemperature,
    requiresRefrigeration,
  },
  
  shelfLife: {              // Срок годности
    type,                   // PERISHABLE, SHELF_STABLE, FROZEN
    baseDays,               // Базовый срок
  },
  
  shrinkage: {              // Усушка (для овощей/фруктов)
    enabled,
    percentPerDay,
  },
  
  tolerance: {              // Допуск веса (±5-15%)
    enabled,
    percent,
  },
}
```

**Используется для:** Создания партий, расчёта сроков, настроек хранения.

---

## ProductTemplate

**Что это:** Настройки продавца для работы с продуктом (ценообразование, автозаказ).

```typescript
ProductTemplate {
  seller,
  product → InventoryProduct,
  
  storageSettings: {
    preset,                 // Переопределение пресета
    customShelfLifeDays,    // Свой срок годности
    shrinkageEnabled,
  },
  
  pricingSettings: {
    baseOnlinePrice,
    baseOfflinePrice,
    minMarkupPercent,       // Минимальная наценка
    purchasePriceStrategy,  // LAST, WEIGHTED_AVERAGE, FIFO_AVERAGE
    autoExpirationDiscounts,
  },
  
  toleranceSettings: {
    weightTolerance,        // ±10% по умолчанию
  },
  
  autoReorder: {            // Автозаказ
    enabled,
    reorderPoint,           // При каком остатке заказывать
    reorderQuantity,
  },
}
```

**Зачем нужен:** Отделяет "что за товар" от "как продавец с ним работает".

---

## StorageLocation

**Что это:** Локация хранения (магазин, склад, холодильник, зона).

```typescript
StorageLocation {
  seller,
  name,                     // "Холодильник №1", "Зона ягод"
  type,                     // SHOP, WAREHOUSE
  locationType,             // FREEZER, REFRIGERATOR, ROOM, DISPLAY
  
  parent,                   // Вложенность: склад → холодильник → зона
  
  targetConditions: {       // Целевые условия
    temperature, humidity,
  },
  
  actualConditions: {       // Фактические (от датчиков или вручную)
    temperature, humidity,
    measuredAt, source,
  },
  
  capacity,                 // Вместимость
  isActive,
}
```

**Иерархия:**
```
Склад "Центральный"
├── Морозильник (-18°C)
│   └── Зона ягод
├── Холодильник (4°C)
│   ├── Зона молочки
│   └── Зона фруктов
└── Комната (20°C)
```

---

## Storefront

**Что это:** Витрина магазина — то, что видит покупатель.

```typescript
Storefront {
  seller,
  shop,
  name,                     // "Основная витрина"
  isActive,
  
  products: [StorefrontProduct],  // Товары на витрине
}

StorefrontProduct {
  product → InventoryProduct,
  
  onlinePrice,              // Цена онлайн
  offlinePrice,             // Цена офлайн (касса)
  
  discounts: [{             // Скидки
    type,                   // PERCENT, FIXED
    value,
    reason,                 // EXPIRATION, PROMO, MANUAL
    validUntil,
  }],
  
  isVisible,                // Показывать покупателям
  isAvailable,              // Есть в наличии (автоматически)
}
```

**Связь с остатками:**
- `isAvailable` автоматически обновляется на основе BatchLocation
- Остаток = сумма `quantity - reservedQuantity` всех BatchLocation

---

## Как они связаны

```
InventoryProduct (что за товар)
       │
       ├── ProductTemplate (настройки продавца)
       │
       ├── Batch (партии товара)
       │      │
       │      └── BatchLocation (где лежит партия)
       │             │
       │             └── StorageLocation (локация)
       │
       └── StorefrontProduct (на витрине)
              │
              └── Storefront → Shop
```

## Экспорт

```typescript
import {
  // InventoryProduct
  INVENTORY_PRODUCT_PORT, InventoryProductPort,
  InventoryProduct, InventoryProductCommands, InventoryProductQueries,
  ProductCategory, ProductUnit, ShelfLifeType,
  
  // ProductTemplate
  PRODUCT_TEMPLATE_PORT, ProductTemplatePort,
  ProductTemplate,
  
  // StorageLocation
  STORAGE_LOCATION_PORT, StorageLocationPort,
  StorageLocation, StorageLocationType,
  
  // Storefront
  STOREFRONT_PORT, StorefrontPort,
  Storefront, StorefrontProduct,
} from 'src/modules/new-inventory/entities';
```
