# Pricing — Ценообразование

Цены, скидки, маржа, автоскидки по сроку годности.

---

## Основные понятия

### Онлайн vs Офлайн цены

```
Один и тот же товар может иметь разные цены:

Яблоки:
├── Онлайн (в приложении): 120₽/кг
└── Офлайн (на кассе): 120₽/кг

Почему могут отличаться:
- Онлайн можно менять мгновенно
- Офлайн нужно печатать новые ценники
- Разные акции для разных каналов
```

### Скидки

```
Яблоки, базовая цена: 150₽/кг

Скидки:
├── -10% (срок истекает через 5 дней)
└── Итого: 135₽/кг
```

### Маржа

```
Закупка: 80₽/кг
Продажа: 120₽/кг
Маржа: 40₽ (33%)

Хорошая маржа? ДА ✓
```

---

## Структура

```
pricing/
├── pricing.enums.ts
├── pricing.types.ts
├── pricing.commands.ts
├── pricing.queries.ts
├── pricing.port.ts
├── pricing.service.ts
├── pricing.module.ts
└── index.ts
```

---

## Автоскидки по сроку

Система автоматически применяет скидки к товарам с истекающим сроком:

```
Правила по умолчанию:
├── Осталось 3 дня → скидка 30%
├── Осталось 5 дней → скидка 20%
└── Осталось 7 дней → скидка 10%
```

### Важно: только ОНЛАЙН!

```
Автоскидки применяются ТОЛЬКО к onlinePrice.
offlinePrice НЕ меняется автоматически!

Почему?
- На кассе ценники физические
- Их нужно перепечатывать
- Это делается вручную
```

### Пример

```
Молоко, базовая цена: 100₽

Онлайн (автоматически):
├── Срок до 05.12 (осталось 3 дня)
├── Скидка 30%
└── Цена: 70₽

Офлайн (вручную):
├── Цена на ценнике: 100₽
├── Менеджер решает: "Поставлю скидку 20%"
└── Печатает новый ценник: 80₽
```

---

## Типы скидок

```typescript
enum DiscountType {
  PERCENT,    // Процентная (-20%)
  FIXED,      // Фиксированная (-50₽)
}

enum DiscountReason {
  EXPIRATION, // По сроку годности
  PROMO,      // Промо-акция
  MANUAL,     // Ручная
  BULK,       // Оптовая
  LOYALTY,    // Лояльность
}
```

---

## Расчёт цены

### Как считается

```
Базовая цена: 150₽

Скидки:
├── EXPIRATION: -10% = -15₽
├── PROMO: -5% = -7.50₽
└── Итого скидок: -22.50₽

Итоговая цена: 150 - 22.50 = 127.50₽
```

### PriceCalculation

```typescript
interface PriceCalculation {
  basePrice: number;        // 150
  discounts: [{
    type: 'PERCENT',
    value: 10,
    reason: 'EXPIRATION',
    amount: 15,             // Сумма скидки
  }];
  totalDiscount: number;    // 22.50
  finalPrice: number;       // 127.50
  finalPricePerUnit: number; // Если покупаем несколько
}
```

---

## Маржа

### Что такое маржа

```
Закупочная цена (себестоимость): 80₽
Продажная цена: 120₽

Маржа = 120 - 80 = 40₽
Маржа % = 40 / 120 × 100 = 33%
```

### Статусы маржи

```
HEALTHY  — > 15%  ✓ Хорошо
LOW      — 5-15%  ⚠ Низковато
NEGATIVE — < 5%   ❌ Плохо, работаем в убыток
```

### MarginInfo

```typescript
interface MarginInfo {
  purchasePrice: 80,
  sellingPrice: 120,
  margin: 40,
  marginPercent: 33,
  status: 'HEALTHY',
}
```

---

## Стратегии закупочной цены

Какую закупочную цену брать для расчёта маржи?

```
У нас 3 партии яблок:
├── Партия #1: закупка 75₽/кг
├── Партия #2: закупка 80₽/кг
└── Партия #3: закупка 85₽/кг

Какая себестоимость?
```

### Стратегии

```typescript
enum PurchasePriceStrategy {
  LAST,              // Последняя закупка (85₽)
  WEIGHTED_AVERAGE,  // Средневзвешенная по количеству
  FIFO_AVERAGE,      // Средняя по активным партиям
}
```

### Пример WEIGHTED_AVERAGE

```
Партия #1: 75₽ × 10 кг = 750₽
Партия #2: 80₽ × 20 кг = 1600₽
Партия #3: 85₽ × 15 кг = 1275₽

Всего: 750 + 1600 + 1275 = 3625₽
Количество: 10 + 20 + 15 = 45 кг

Средневзвешенная: 3625 / 45 = 80.56₽/кг
```

---

## Примеры использования

### Рассчитать цену

```typescript
const calculation = await pricingPort.calculateFinalPrice(
  new PricingQueries.CalculateFinalPriceQuery({
    storefrontProductId,
    quantity: 2,
    channel: SalesChannel.ONLINE,
  }),
);

// calculation:
// {
//   basePrice: 240,           // 120₽ × 2
//   discounts: [
//     { type: 'PERCENT', value: 10, reason: 'EXPIRATION', amount: 24 },
//   ],
//   totalDiscount: 24,
//   finalPrice: 216,
//   finalPricePerUnit: 108,
// }
```

### Рассчитать маржу

```typescript
const margin = await pricingPort.calculateMargin(
  new PricingQueries.CalculateMarginQuery({
    productId,
    storefrontId,
  }),
);

// margin:
// {
//   purchasePrice: 80,
//   sellingPrice: 120,
//   margin: 40,
//   marginPercent: 33,
//   status: 'HEALTHY',
// }
```

### Применить скидку

```typescript
await pricingPort.applyDiscount(
  new PricingCommands.ApplyDiscountCommand({
    storefrontProductId,
    discount: {
      type: DiscountType.PERCENT,
      value: 20,
      reason: DiscountReason.PROMO,
      validUntil: new Date('2024-12-31'),
    },
  }),
);
```

### Автоприменить скидки по сроку

```typescript
await pricingPort.autoApplyExpirationDiscounts(
  new PricingCommands.AutoApplyExpirationDiscountsCommand({
    storefrontId,
  }),
);

// Система:
// 1. Находит товары с истекающим сроком
// 2. Применяет скидки согласно правилам
// 3. Только к onlinePrice!
```

### Найти товары с низкой маржой

```typescript
const lowMargin = await pricingPort.getLowMarginProducts(
  new PricingQueries.GetLowMarginProductsQuery({
    storefrontId,
    minMarginPercent: 10,
  }),
);

// lowMargin:
// [
//   { product: 'Бананы', margin: 8%, status: 'LOW' },
//   { product: 'Молоко', margin: 3%, status: 'NEGATIVE' },
// ]
```

---

## Настройки ценообразования

В ProductTemplate хранятся настройки:

```typescript
ProductTemplate.pricingSettings: {
  baseOnlinePrice: 120,
  baseOfflinePrice: 120,
  minMarkupPercent: 20,           // Минимальная наценка
  purchasePriceStrategy: 'WEIGHTED_AVERAGE',
  autoExpirationDiscounts: true,  // Включить автоскидки
}
```

---

## Экспорт

```typescript
import {
  PRICING_PORT,
  PricingPort,
  
  SalesChannel,
  MarginStatus,
  DiscountType,
  DiscountReason,
  
  PricingCommands,
  PricingQueries,
} from 'src/modules/new-inventory/pricing';
```
