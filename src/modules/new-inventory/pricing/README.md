# Pricing

Ценообразование: расчёт цен, скидки, маржа.

## Структура

```
pricing/
├── pricing.enums.ts      # SalesChannel, MarginStatus
├── pricing.types.ts      # Типы
├── pricing.commands.ts   # Команды
├── pricing.queries.ts    # Запросы
├── pricing.port.ts       # Интерфейс
├── pricing.service.ts    # Реализация
├── pricing.module.ts     # NestJS модуль
└── index.ts
```

## Концепции

### Онлайн vs Офлайн цены

```typescript
StorefrontProduct {
  onlinePrice,              // Цена в приложении
  offlinePrice,             // Цена на кассе
}
```

**Почему разные:**
- Онлайн можно менять мгновенно
- Офлайн требует смены ценников
- Автоскидки по сроку — **только онлайн**

### Типы скидок

```typescript
enum DiscountType {
  PERCENT,                  // Процентная
  FIXED,                    // Фиксированная сумма
}

enum DiscountReason {
  EXPIRATION,               // По сроку годности
  PROMO,                    // Промо-акция
  MANUAL,                   // Ручная
  BULK,                     // Оптовая
  LOYALTY,                  // Лояльность
}
```

### Автоскидки по сроку

```typescript
// Правила по умолчанию
const DEFAULT_EXPIRATION_RULES = [
  { daysUntilExpiration: 3, discountPercent: 30, description: 'Критичный срок' },
  { daysUntilExpiration: 5, discountPercent: 20, description: 'Срок истекает' },
  { daysUntilExpiration: 7, discountPercent: 10, description: 'Скоро истечёт' },
];

// Применяются автоматически к onlinePrice
// offlinePrice НЕ меняется (требует физической смены ценников)
```

## Расчёт цены

```typescript
interface PriceCalculation {
  basePrice: number;        // Базовая цена
  discounts: [{
    type, value, reason,
    amount,                 // Сумма скидки
  }];
  totalDiscount: number;    // Общая скидка
  finalPrice: number;       // Итоговая цена
  finalPricePerUnit: number;
}
```

## Маржа

```typescript
interface MarginInfo {
  purchasePrice: number;    // Закупочная
  sellingPrice: number;     // Продажная
  margin: number;           // Маржа в рублях
  marginPercent: number;    // Маржа в %
  status: MarginStatus;     // HEALTHY, LOW, NEGATIVE
}

enum MarginStatus {
  HEALTHY,                  // > 15%
  LOW,                      // 5-15%
  NEGATIVE,                 // < 5%
}
```

## Стратегии закупочной цены

Для расчёта наценки нужна "закупочная цена". Откуда её брать?

```typescript
enum PurchasePriceStrategy {
  LAST,                     // Последняя закупка
  WEIGHTED_AVERAGE,         // Средневзвешенная по партиям
  FIFO_AVERAGE,             // Средняя по активным FEFO партиям
}
```

## Команды

```typescript
// Обновить закупочную цену (при приёмке)
new PricingCommands.UpdatePurchasePriceFromBatchCommand({
  productId, storefrontId,
  newBatchPrice: 80,
  strategy: PurchasePriceStrategy.WEIGHTED_AVERAGE,
});

// Применить скидку
new PricingCommands.ApplyDiscountCommand({
  storefrontProductId,
  discount: {
    type: DiscountType.PERCENT,
    value: 20,
    reason: DiscountReason.PROMO,
    validUntil: new Date('2024-12-31'),
  },
});

// Автоприменить скидки по сроку
new PricingCommands.AutoApplyExpirationDiscountsCommand({
  storefrontId,
});

// Обновить цену товара
new PricingCommands.UpdateProductPriceCommand({
  storefrontProductId,
  onlinePrice: 150,
  offlinePrice: 150,
});
```

## Запросы

```typescript
// Рассчитать итоговую цену
new PricingQueries.CalculateFinalPriceQuery({
  storefrontProductId,
  quantity: 2,
  channel: SalesChannel.ONLINE,
});

// Рассчитать маржу
new PricingQueries.CalculateMarginQuery({
  productId, storefrontId,
});

// Товары с низкой маржой
new PricingQueries.GetLowMarginProductsQuery({
  storefrontId,
  minMarginPercent: 10,
});

// Товары, требующие автоскидку
new PricingQueries.GetProductsRequiringExpirationDiscountQuery({
  storefrontId,
});
```

## Пример: расчёт цены

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
//   basePrice: 200,                  // 100₽ × 2
//   discounts: [
//     { type: 'PERCENT', value: 10, reason: 'EXPIRATION', amount: 20 },
//   ],
//   totalDiscount: 20,
//   finalPrice: 180,
//   finalPricePerUnit: 90,
// }
```

## Экспорт

```typescript
import {
  PRICING_PORT, PricingPort,
  SalesChannel, MarginStatus,
  DiscountType, DiscountReason,
  PricingCommands, PricingQueries,
} from 'src/modules/new-inventory/pricing';
```
