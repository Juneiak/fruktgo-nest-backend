# Фаза 6: Ценообразование

> **Срок:** 2-3 дня  
> **Зависимости:** Фаза 1 (нужны StorefrontProduct), Фаза 2 (нужны Batch)

---

## Что делаем в этой фазе

**Pricing** — продвинутое ценообразование:
- Разные цены онлайн/офлайн
- Оптовые цены
- Автоскидки по сроку годности
- Расчёт маржинальности

---

## Зачем это нужно (простыми словами)

### Почему цены разные онлайн и офлайн?

**Онлайн дороже**, потому что:
- Нужно собрать заказ (работа сборщика)
- Нужно доставить (работа курьера)
- Упаковка

**Офлайн дешевле**, потому что:
- Клиент сам пришёл
- Сам выбрал
- Сам унёс

### Почему нужны автоскидки?

Клубника истекает через 2 дня. Если не продать — списать (потеря 100%).

Лучше продать со скидкой 50% (потеря 50%), чем выбросить.

**Автоскидки работают только онлайн** — офлайн требует физической смены ценников.

---

## Порядок разработки

### Шаг 1: Структура цен

**Где хранятся цены:**

```
ProductTemplate
└── recommendedRetailPrice: 180 ₽/кг (рекомендованная, справочная)

Batch
└── purchasePrice: 80 ₽/кг (закупочная из накладной)

StorefrontProduct
└── pricing:
    ├── purchasePrice: 80 ₽/кг (копируется из последней партии)
    ├── onlinePrice: 150 ₽/кг
    ├── offlinePrice: 140 ₽/кг
    ├── wholesale: { minQty: 10, price: 120 ₽/кг }
    └── discount: { type: PERCENT, value: 20 }
```

### Шаг 2: PricingService

**Файлы:**
- `pricing/pricing.service.ts`
- `pricing/pricing.types.ts`
- `pricing/pricing.module.ts`

**Основные методы:**

```typescript
// Рассчитать финальную цену
calculateFinalPrice(input: {
  storefrontProduct: StorefrontProduct
  quantity: number
  channel: 'online' | 'offline'
  promoCode?: string
}): PriceCalculation

// Обновить закупочную из новой партии
updatePurchasePriceFromBatch(input: {
  storefrontProductId: string
  batchPurchasePrice: number
  strategy: 'LAST' | 'WEIGHTED_AVERAGE' | 'FIFO_AVERAGE'
}): Promise<void>

// Автоматически применить скидки по сроку
autoApplyExpirationDiscounts(input: {
  storefrontId: string
  rules: ExpirationDiscountRule[]
}): Promise<AppliedDiscount[]>

// Рассчитать маржинальность
calculateMargin(pricing: ProductPricing): MarginInfo

// Проверить выгодность
isProfitable(pricing: ProductPricing, minMarginPercent: number): boolean
```

---

### Шаг 3: Расчёт финальной цены

**Алгоритм:**

```typescript
function calculateFinalPrice(input): PriceCalculation {
  const { storefrontProduct, quantity, channel, promoCode } = input
  const pricing = storefrontProduct.pricing
  
  // 1. Базовая цена по каналу
  let basePrice = channel === 'online' 
    ? pricing.onlinePrice 
    : (pricing.offlinePrice ?? pricing.onlinePrice)
  
  // 2. Проверка оптовой цены
  let isWholesale = false
  if (pricing.wholesale && quantity >= pricing.wholesale.minQuantity) {
    basePrice = pricing.wholesale.price
    isWholesale = true
  }
  
  // 3. Применение скидки (если есть и активна)
  let discountAmount = 0
  if (pricing.discount && isDiscountActive(pricing.discount)) {
    if (pricing.discount.type === 'PERCENT') {
      discountAmount = basePrice * (pricing.discount.value / 100)
    } else { // FIXED
      discountAmount = pricing.discount.value
    }
    basePrice = Math.max(0, basePrice - discountAmount)
  }
  
  // 4. Промокод (если есть)
  let promoDiscount = 0
  if (promoCode) {
    promoDiscount = await this.applyPromoCode(promoCode, basePrice)
    basePrice = Math.max(0, basePrice - promoDiscount)
  }
  
  // 5. Итоговая сумма
  const totalPrice = basePrice * quantity
  
  return {
    unitPrice: basePrice,
    quantity,
    totalPrice,
    breakdown: {
      originalPrice: pricing.onlinePrice,
      wholesaleApplied: isWholesale,
      discountApplied: discountAmount > 0,
      discountAmount,
      promoCodeApplied: promoDiscount > 0,
      promoDiscount,
    }
  }
}
```

**Пример:**

```
Яблоки: онлайн 150₽/кг, опт от 10 кг = 120₽/кг, скидка 20%

Заказ 5 кг онлайн:
├── Базовая: 150₽
├── Оптовая: не применяется (< 10 кг)
├── Скидка 20%: 150 × 0.8 = 120₽
└── Итого: 120 × 5 = 600₽

Заказ 15 кг онлайн:
├── Базовая: 150₽
├── Оптовая: 120₽ (≥ 10 кг)
├── Скидка 20%: 120 × 0.8 = 96₽
└── Итого: 96 × 15 = 1440₽
```

---

### Шаг 4: Автоскидки по сроку годности

**Правила по умолчанию:**

```typescript
const DEFAULT_EXPIRATION_DISCOUNT_RULES: ExpirationDiscountRule[] = [
  { daysUntilExpiration: 7, discountPercent: 10 },
  { daysUntilExpiration: 5, discountPercent: 20 },
  { daysUntilExpiration: 3, discountPercent: 30 },
  { daysUntilExpiration: 1, discountPercent: 50 },
]
```

**Важно: только для онлайн-цены!**

Офлайн-цена не меняется автоматически (нужно физически менять ценники).

**Алгоритм:**

```typescript
async autoApplyExpirationDiscounts(input): Promise<AppliedDiscount[]> {
  const { storefrontId, rules } = input
  const applied: AppliedDiscount[] = []
  
  // 1. Получаем все StorefrontProduct витрины
  const storefront = await this.storefrontModel.findById(storefrontId)
  
  for (const product of storefront.products) {
    // 2. Находим партии этого товара
    const batches = await this.batchModel.find({
      productTemplate: product.productTemplate,
      status: 'ACTIVE',
    }).sort({ effectiveExpirationDate: 1 }) // Сначала те, что истекают раньше
    
    if (batches.length === 0) continue
    
    // 3. Берём ближайший срок (FEFO)
    const nearestExpiration = batches[0].effectiveExpirationDate
    const daysRemaining = daysBetween(new Date(), nearestExpiration)
    
    // 4. Находим подходящее правило
    const rule = rules.find(r => daysRemaining <= r.daysUntilExpiration)
    
    if (rule) {
      // 5. Применяем скидку
      product.pricing.discount = {
        type: 'PERCENT',
        value: rule.discountPercent,
        reason: 'EXPIRING_SOON',
        batches: [batches[0]._id],
        endsAt: nearestExpiration, // Скидка до конца срока
      }
      
      applied.push({
        product: product._id,
        discountPercent: rule.discountPercent,
        daysRemaining,
        batch: batches[0]._id,
      })
    }
  }
  
  await storefront.save()
  return applied
}
```

**Пример работы:**

```
Запуск автоскидок для магазина "На Ленина":

Клубника (P-015): срок до 08.12 (3 дня)
├── Правило: ≤3 дней → 30%
├── Было: 300₽/кг онлайн
└── Стало: 210₽/кг онлайн (офлайн остался 280₽)

Яблоки (P-010): срок до 20.12 (15 дней)
├── Правило: не применяется (> 7 дней)
└── Цена без изменений

Творог (P-022): срок до 06.12 (1 день)
├── Правило: ≤1 день → 50%
├── Было: 120₽/шт онлайн
└── Стало: 60₽/шт онлайн
```

---

### Шаг 5: Расчёт маржинальности

**Формула:**
```
Маржа = (Цена продажи - Закупочная) / Цена продажи × 100%
```

**Пример:**
```
Закупка: 80₽/кг
Продажа: 150₽/кг
Маржа: (150 - 80) / 150 = 46.7%
```

**Рекомендации:**
- Минимальная маржа: 20% (иначе предупреждение)
- Целевая маржа: 30-50%
- При марже < 10%: требуется подтверждение

**Метод:**

```typescript
calculateMargin(pricing: ProductPricing): MarginInfo {
  const purchasePrice = pricing.purchasePrice || 0
  
  const onlineMargin = purchasePrice > 0
    ? ((pricing.onlinePrice - purchasePrice) / pricing.onlinePrice) * 100
    : null
    
  const offlineMargin = pricing.offlinePrice && purchasePrice > 0
    ? ((pricing.offlinePrice - purchasePrice) / pricing.offlinePrice) * 100
    : null
  
  return {
    purchasePrice,
    onlinePrice: pricing.onlinePrice,
    offlinePrice: pricing.offlinePrice,
    onlineMargin,
    offlineMargin,
    warnings: [
      onlineMargin !== null && onlineMargin < 20 ? 'LOW_ONLINE_MARGIN' : null,
      offlineMargin !== null && offlineMargin < 20 ? 'LOW_OFFLINE_MARGIN' : null,
    ].filter(Boolean),
  }
}
```

---

### Шаг 6: Обновление закупочной цены

**Когда обновляется:**
- При подтверждении Receiving (новая партия)
- При смешивании партий (MixedBatch)

**Стратегии:**
```
LAST             — цена из последней партии
WEIGHTED_AVERAGE — средневзвешенная по остаткам
FIFO_AVERAGE     — средняя по FEFO-партиям
```

**Метод:**

```typescript
async updatePurchasePriceFromBatch(input): Promise<void> {
  const { storefrontProductId, batchPurchasePrice, strategy } = input
  
  const storefrontProduct = await this.storefrontProductModel.findById(storefrontProductId)
  
  switch (strategy) {
    case 'LAST':
      storefrontProduct.pricing.purchasePrice = batchPurchasePrice
      break
      
    case 'WEIGHTED_AVERAGE':
      // Средневзвешенная по всем остаткам
      const batches = await this.batchModel.find({
        productTemplate: storefrontProduct.productTemplate,
        status: 'ACTIVE',
      })
      
      let totalQty = 0
      let totalValue = 0
      for (const batch of batches) {
        totalQty += batch.currentQuantity
        totalValue += batch.currentQuantity * batch.purchasePrice
      }
      
      storefrontProduct.pricing.purchasePrice = totalValue / totalQty
      break
      
    case 'FIFO_AVERAGE':
      // Берём только партии, которые будут проданы первыми (по FEFO)
      // ... логика
      break
  }
  
  await storefrontProduct.save()
}
```

---

## Структура файлов после Фазы 6

```
src/modules/new-inventory/
├── ...                      # Из предыдущих фаз
│
└── pricing/                 # НОВОЕ
    ├── pricing.service.ts
    ├── pricing.types.ts
    ├── pricing.module.ts
    └── index.ts
```

---

## Чек-лист готовности

- [ ] PricingService — calculateFinalPrice (онлайн/офлайн/опт/скидки)
- [ ] PricingService — autoApplyExpirationDiscounts
- [ ] PricingService — calculateMargin
- [ ] PricingService — updatePurchasePriceFromBatch
- [ ] Интеграция с Receiving (обновление закупочной)
- [ ] Cron-задача для автоскидок (ежедневно)
- [ ] Тесты на расчёт цен

---

## Результат Фазы 6

После завершения можно:
1. Рассчитывать финальную цену с учётом канала, количества, скидок
2. Автоматически применять скидки при истечении срока
3. Видеть маржинальность по каждому товару
4. Получать предупреждения о низкой марже
5. Автоматически обновлять закупочную цену из новых партий
