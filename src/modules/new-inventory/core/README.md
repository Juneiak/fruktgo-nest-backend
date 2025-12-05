# Core

Ядро модуля складского учёта: пресеты условий хранения и калькулятор сроков годности.

## Структура

```
core/
├── storage-preset/          # Пресеты условий хранения по категориям
├── storage-conditions/      # Условия хранения (температура, влажность)
├── shelf-life-calculator/   # Калькулятор динамических сроков годности
└── index.ts
```

## StoragePreset

Предустановленные условия хранения для разных категорий товаров.

```typescript
enum StoragePreset {
  TROPICAL_FRUITS,    // Бананы, манго: 12-14°C
  APPLES_PEARS,       // Яблоки, груши: 0-4°C
  CITRUS,             // Цитрусы: 4-8°C
  BERRIES,            // Ягоды: 0-4°C, влажность 90-95%
  LEAFY_GREENS,       // Зелень: 0-2°C
  ROOT_VEGETABLES,    // Корнеплоды: 0-4°C
  TOMATOES,           // Томаты: 12-15°C (не холодильник!)
  DAIRY,              // Молочка: 2-6°C
  MEAT_FRESH,         // Мясо свежее: 0-4°C
  FROZEN,             // Заморозка: -18°C
  BAKERY,             // Выпечка: комнатная
  GENERIC,            // Универсальный
}
```

**Каждый пресет содержит:**
- Диапазон температуры (min/max/optimal)
- Диапазон влажности
- Базовый срок годности (дни)
- Коэффициент деградации при отклонении

## StorageConditions

Текущие условия хранения в локации.

```typescript
interface StorageConditions {
  temperature: number;      // Текущая температура °C
  humidity: number;         // Текущая влажность %
  measuredAt: Date;         // Когда измерено
  source: 'MANUAL' | 'SENSOR';
}
```

## ShelfLifeCalculator

Рассчитывает динамический срок годности с учётом условий хранения.

```typescript
// Использование
const calculator = new ShelfLifeCalculatorService();

// Рассчитать оставшийся срок
const remaining = calculator.calculateRemainingShelfLife({
  product,           // InventoryProduct с настройками хранения
  expirationDate,    // Исходная дата истечения
  currentConditions, // Текущие условия в локации
});

// remaining = {
//   days: 5,
//   hours: 12,
//   degradationFactor: 1.2,  // >1 = срок сокращается
//   recommendation: 'SELL_SOON',
// }
```

**Логика:**
- Если условия хуже оптимальных → срок сокращается (degradationFactor > 1)
- Если условия лучше → срок может немного продлиться
- Заморозка останавливает деградацию

## Экспорт

```typescript
import {
  StoragePreset,
  StorageConditions,
  ShelfLifeCalculatorService,
  SHELF_LIFE_CALCULATOR,
} from 'src/modules/new-inventory/core';
```
