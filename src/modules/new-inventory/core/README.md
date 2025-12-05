# Core — Ядро системы

Базовые вещи: как хранить товары и как считать сроки годности.

---

## Зачем это нужно?

Разные товары хранятся по-разному:
- Яблоки — в холодильнике при 0-4°C
- Бананы — в комнате при 12-14°C (в холодильнике чернеют!)
- Молоко — строго 2-6°C
- Замороженные ягоды — в морозилке при -18°C

Если хранить неправильно — срок годности сокращается.

---

## Что внутри

```
core/
├── storage-preset/          # Пресеты "как хранить"
├── storage-conditions/      # Текущие условия в локации
├── shelf-life-calculator/   # Калькулятор "сколько осталось"
└── index.ts
```

---

## Storage Preset — Пресеты хранения

**Что это:** Готовые настройки для разных категорий товаров.

### Пример

```
Пресет: APPLES_PEARS (яблоки и груши)
├── Температура: 0-4°C (оптимально 2°C)
├── Влажность: 85-95%
├── Базовый срок: 30 дней
└── Деградация: ×1.5 если температура > 8°C
```

### Доступные пресеты

| Пресет | Товары | Температура | Срок |
|--------|--------|-------------|------|
| `TROPICAL_FRUITS` | Бананы, манго, ананас | 12-14°C | 7-10 дней |
| `APPLES_PEARS` | Яблоки, груши | 0-4°C | 30+ дней |
| `CITRUS` | Апельсины, лимоны | 4-8°C | 21 день |
| `BERRIES` | Клубника, малина, черника | 0-4°C | 3-7 дней |
| `LEAFY_GREENS` | Салат, шпинат, укроп | 0-2°C | 5-7 дней |
| `ROOT_VEGETABLES` | Морковь, свёкла, картофель | 0-4°C | 30+ дней |
| `TOMATOES` | Томаты | 12-15°C | 7-14 дней |
| `DAIRY` | Молоко, йогурт, сыр | 2-6°C | 7-30 дней |
| `MEAT_FRESH` | Мясо свежее | 0-4°C | 3-5 дней |
| `FROZEN` | Всё замороженное | -18°C | 180+ дней |
| `BAKERY` | Хлеб, выпечка | 18-22°C | 2-5 дней |
| `GENERIC` | Универсальный | 15-25°C | 30 дней |

### Как используется

```typescript
// При создании продукта указываем пресет
const product = await productPort.create({
  name: 'Яблоки Голден',
  category: ProductCategory.FRUITS,
  storageRequirements: {
    preset: StoragePreset.APPLES_PEARS,  // ← Пресет
  },
  shelfLife: {
    baseDays: 30,  // Базовый срок
  },
});
```

---

## Storage Conditions — Условия хранения

**Что это:** Текущие условия в конкретной локации (холодильнике, складе, витрине).

### Пример

```
Холодильник #1 в магазине "Фрукты у дома"
├── Температура: 3°C ✓
├── Влажность: 87% ✓
├── Измерено: 5 минут назад
└── Источник: датчик (или вручную)
```

### Откуда берутся данные

**Вариант 1: Датчики (автоматически)**
```
Датчик IoT → API → StorageConditions
Обновляется каждые 5-15 минут
```

**Вариант 2: Вручную (сотрудник вводит)**
```
Сотрудник смотрит термометр → вводит в систему
```

### Структура

```typescript
StorageConditions {
  temperature: 3,           // °C
  humidity: 87,             // %
  measuredAt: Date,         // Когда измерено
  source: 'SENSOR' | 'MANUAL',
}
```

---

## Shelf Life Calculator — Калькулятор сроков

**Что это:** Считает, сколько реально осталось хранить товар с учётом условий.

### Простой пример

```
Яблоки, срок до 20.12.2024
Хранятся при 3°C (норма 0-4°C)
→ Всё хорошо, срок не меняется
```

### Пример с отклонением

```
Яблоки, срок до 20.12.2024
Хранились 3 дня при 10°C (норма 0-4°C)
→ Коэффициент деградации: 1.5
→ 3 дня × 1.5 = 4.5 дней "потеряно"
→ Новый эффективный срок: 15.12.2024
```

### Как это работает

```typescript
const result = calculator.calculateRemainingShelfLife({
  product,              // Продукт с настройками хранения
  expirationDate,       // Исходный срок
  currentConditions,    // Текущие условия в локации
});

// result:
// {
//   days: 5,                    // Осталось дней
//   hours: 12,                  // + часов
//   degradationFactor: 1.2,     // Коэффициент (>1 = срок сокращается)
//   recommendation: 'SELL_SOON', // Рекомендация
// }
```

### Рекомендации

| Recommendation | Что значит |
|----------------|------------|
| `NORMAL` | Всё хорошо, храним дальше |
| `SELL_SOON` | Скоро истечёт, нужно продать |
| `DISCOUNT` | Пора делать скидку |
| `WRITE_OFF` | Срок истёк, списывать |

---

## Как всё связано

```
Продукт создаётся с пресетом
        ↓
StoragePreset говорит: "Храни при 0-4°C"
        ↓
Товар лежит в холодильнике
        ↓
StorageConditions: "Сейчас 3°C"
        ↓
ShelfLifeCalculator: "Всё ок, срок не меняется"

        или

StorageConditions: "Сейчас 10°C" (отклонение!)
        ↓
ShelfLifeCalculator: "Срок сократился на 20%"
        ↓
Создаётся алерт: "Температура вне нормы!"
```

---

## Использование

```typescript
import {
  // Пресеты
  StoragePreset,
  
  // Условия
  StorageConditions,
  
  // Калькулятор
  ShelfLifeCalculatorService,
  SHELF_LIFE_CALCULATOR,
} from 'src/modules/new-inventory/core';

// Пример
@Inject(SHELF_LIFE_CALCULATOR)
private calculator: ShelfLifeCalculatorService;

const remaining = this.calculator.calculateRemainingShelfLife({
  product: apples,
  expirationDate: new Date('2024-12-20'),
  currentConditions: { temperature: 3, humidity: 87 },
});

console.log(`Осталось ${remaining.days} дней`);
```

---

## Файлы

```
core/
├── storage-preset/
│   ├── storage-preset.enums.ts      # Enum с пресетами
│   ├── storage-preset.config.ts     # Настройки каждого пресета
│   └── index.ts
│
├── storage-conditions/
│   ├── storage-conditions.schema.ts # Схема условий
│   └── index.ts
│
├── shelf-life-calculator/
│   ├── shelf-life-calculator.service.ts  # Сам калькулятор
│   ├── shelf-life-calculator.types.ts    # Типы
│   └── index.ts
│
└── index.ts                         # Общий экспорт
```
