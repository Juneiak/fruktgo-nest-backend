# Процесс: Расчёт комиссий

**Участники:** Shop, Seller, PlatformStaff  
**Зависимости:** SettlementPeriod, Commission Module

---

## Краткое содержание

### Основная идея

Платформа берёт **комиссию** с каждого заказа магазина. Комиссия **не фиксированная**, а **динамическая**: базовая ставка (10-30% по категории товара) + скидки за хорошую работу (стаж, объёмы, качество) + надбавки за нарушения (просрочки, жалобы, низкий рейтинг). Итоговая ставка пересчитывается **ежемесячно**.

**Схема:** Базовая ставка → применение скидок → применение надбавок → итоговая ставка (10-40%).

### Ключевая логика

**Базовая ставка (по категории):**
- Овощи и фрукты — 18%
- Молочные продукты — 20%
- Мясо и рыба — 22%
- Бакалея — 20%
- Деликатесы — 25%

**Скидки (понижают комиссию):**
- **Стаж** — -2% после 6 месяцев работы
- **Объём** — -1% при обороте >500к₽/месяц
- **Качество** — -1% при рейтинге ≥4.9
- Максимальная скидка: -5%

**Надбавки (повышают комиссию):**
- **Нарушения** — +3% при частых просрочках
- **Жалобы** — +2% при низком рейтинге (<3.5)
- **Споры** — +1% при частых спорах
- Максимальная надбавка: +10%

**Диапазон:**
- Минимальная комиссия: 10%
- Максимальная комиссия: 40%
- Индивидуальные условия: возможны по согласованию с платформой

### Прозрачность для продавца

Продавец в панели видит свою текущую ставку комиссии, разбивку по компонентам (база + скидки + надбавки), прогноз на следующий месяц. Может посмотреть, что нужно улучшить для снижения комиссии.

---

## Обзор

Детальная система расчёта комиссий платформы с учётом множества факторов и динамических корректировок.

**Принципы:**
- Базовая ставка зависит от категории товаров
- Динамические корректировки на основе KPI
- Прозрачность расчёта для селлера
- Возможность индивидуальных условий

---

## Структура комиссии

### Компоненты

```typescript
{
  baseRate: 20,           // Базовая ставка (%)
  
  // Скидки (понижают комиссию)
  discounts: {
    loyalty: -2,          // За стаж
    volume: -1,           // За объём
    quality: -1,          // За качество
    total: -4
  },
  
  // Надбавки (повышают комиссию)  
  surcharges: {
    penalties: +3,        // За нарушения
    complaints: +2,       // За жалобы
    total: +5
  },
  
  finalRate: 21,          // Итоговая ставка (%)
  minRate: 10,            // Минимум
  maxRate: 40             // Максимум
}
```

---

## 1. Базовые ставки

### По категориям товаров

| Категория | Код | Базовая ставка | Обоснование |
|-----------|-----|----------------|-------------|
| **Овощи и фрукты** | `PRODUCE` | 18% | Высокая оборачиваемость |
| **Молочные продукты** | `DAIRY` | 20% | Средние сроки хранения |
| **Мясо и рыба** | `MEAT_FISH` | 22% | Требуют холодильников |
| **Бакалея** | `GROCERY` | 20% | Стандартная категория |
| **Напитки** | `BEVERAGES` | 18% | Большие объёмы |
| **Алкоголь** | `ALCOHOL` | 25% | Лицензирование |
| **Табак** | `TOBACCO` | 30% | Акцизные товары |
| **Бытовая химия** | `HOUSEHOLD` | 22% | Низкая маржинальность |
| **Готовая еда** | `READY_FOOD` | 25% | Короткие сроки |
| **Прочее** | `OTHER` | 25% | По умолчанию |

### Специальные товары

| Тип товара | Дополнительно | Причина |
|------------|---------------|---------|
| Маркированные (Честный ЗНАК) | +2% | Дополнительный учёт |
| Весовые | +1% | Сложность учёта |
| Акционные | -2% | Стимулирование |
| Собственное производство | -3% | Поддержка производителей |

---

## 2. Система скидок

### Лояльность (стаж работы)

```typescript
function getLoyaltyDiscount(months: number): number {
  if (months >= 24) return -5;  // 2+ года
  if (months >= 12) return -3;  // 1+ год
  if (months >= 6) return -2;   // 6+ месяцев
  if (months >= 3) return -1;   // 3+ месяца
  return 0;
}
```

| Стаж | Скидка | Условия |
|------|--------|---------|
| 3+ мес | -1% | Прошёл испытательный срок |
| 6+ мес | -2% | Стабильная работа |
| 12+ мес | -3% | Годовой партнёр |
| 24+ мес | -5% | VIP партнёр |

### Объём продаж

```typescript
function getVolumeDiscount(monthlyRevenue: number): number {
  if (monthlyRevenue >= 2000000) return -5;  // 2М+
  if (monthlyRevenue >= 1000000) return -3;  // 1М+
  if (monthlyRevenue >= 500000) return -2;   // 500К+
  if (monthlyRevenue >= 300000) return -1;   // 300К+
  return 0;
}
```

| Оборот/мес | Скидка | Примечание |
|------------|--------|------------|
| 300К+ | -1% | Малый бизнес |
| 500К+ | -2% | Средний бизнес |
| 1М+ | -3% | Крупный партнёр |
| 2М+ | -5% | Ключевой партнёр |

### Качество обслуживания

```typescript
function getQualityDiscount(metrics: QualityMetrics): number {
  let discount = 0;
  
  if (metrics.rating >= 4.9) discount -= 2;
  else if (metrics.rating >= 4.7) discount -= 1;
  
  if (metrics.slaCompliance >= 98) discount -= 1;
  if (metrics.complaintsRate < 0.01) discount -= 1;  // <1%
  
  return Math.max(discount, -4);  // Максимум -4%
}
```

| Метрика | Значение | Скидка |
|---------|----------|--------|
| Рейтинг 4.7+ | Высокий | -1% |
| Рейтинг 4.9+ | Отличный | -2% |
| SLA 98%+ | Надёжность | -1% |
| Жалобы <1% | Качество | -1% |

### Участие в программах

| Программа | Скидка | Условия |
|-----------|--------|---------|
| Эксклюзивность | -3% | Только через платформу |
| Экспресс-доставка | -2% | Доставка <30 мин |
| Ночные продажи | -2% | Работа 24/7 |
| Эко-упаковка | -1% | Экологичная упаковка |

---

## 3. Система надбавок (штрафные)

### Качество товара

```typescript
function getQualityPenalty(metrics: QualityMetrics): number {
  let penalty = 0;
  
  if (metrics.rating < 3.0) penalty += 5;
  else if (metrics.rating < 3.5) penalty += 3;
  
  if (metrics.returnRate > 0.05) penalty += 2;  // >5% возвратов
  if (metrics.complaintsRate > 0.05) penalty += 3;  // >5% жалоб
  
  return Math.min(penalty, 10);  // Максимум +10%
}
```

| Проблема | Критерий | Надбавка |
|----------|----------|----------|
| Низкий рейтинг | <3.5 | +3% |
| Очень низкий рейтинг | <3.0 | +5% |
| Много возвратов | >5% | +2% |
| Много жалоб | >5% | +3% |
| Частые списания | >10% | +2% |

### Операционные нарушения

| Нарушение | Частота | Надбавка |
|-----------|---------|----------|
| Отмена заказов | >10% | +2% |
| Отмена заказов | >20% | +5% |
| Задержки доставки | >10% | +2% |
| Задержки доставки | >20% | +4% |
| SLA compliance | <80% | +3% |
| SLA compliance | <60% | +5% |

### Финансовые нарушения

| Нарушение | Сумма | Надбавка |
|-----------|-------|----------|
| Штрафы | >5% от оборота | +2% |
| Штрафы | >10% от оборота | +5% |
| Недостачи | >2% от оборота | +3% |
| Возвраты | >10% от оборота | +3% |

---

## 4. Расчёт итоговой комиссии

### Алгоритм

```typescript
function calculateCommission(shop: Shop, period: SettlementPeriod): Commission {
  // 1. Базовая ставка
  const baseRate = getBaseRateByCategory(shop.mainCategory);
  
  // 2. Скидки
  const loyaltyDiscount = getLoyaltyDiscount(shop.monthsActive);
  const volumeDiscount = getVolumeDiscount(period.revenue);
  const qualityDiscount = getQualityDiscount(shop.metrics);
  const programDiscount = getProgramDiscount(shop.programs);
  
  const totalDiscount = 
    loyaltyDiscount + 
    volumeDiscount + 
    qualityDiscount + 
    programDiscount;
  
  // 3. Надбавки
  const qualityPenalty = getQualityPenalty(shop.metrics);
  const operationPenalty = getOperationPenalty(shop.metrics);
  const financePenalty = getFinancePenalty(period);
  
  const totalPenalty = 
    qualityPenalty + 
    operationPenalty + 
    financePenalty;
  
  // 4. Итоговая ставка
  let finalRate = baseRate + totalDiscount + totalPenalty;
  
  // 5. Ограничения
  finalRate = Math.max(MIN_RATE, Math.min(MAX_RATE, finalRate));
  
  // 6. Минимальная комиссия
  const commission = Math.max(
    period.revenue * finalRate / 100,
    MIN_COMMISSION_AMOUNT  // 50₽
  );
  
  return {
    baseRate,
    discounts: {
      loyalty: loyaltyDiscount,
      volume: volumeDiscount,
      quality: qualityDiscount,
      program: programDiscount,
      total: totalDiscount
    },
    surcharges: {
      quality: qualityPenalty,
      operation: operationPenalty,
      finance: financePenalty,
      total: totalPenalty
    },
    finalRate,
    amount: commission
  };
}
```

### Примеры расчёта

#### Пример 1: Хороший магазин

```typescript
// Магазин работает 8 месяцев, оборот 600К/мес, рейтинг 4.8
{
  baseRate: 20,          // Молочные продукты
  
  discounts: {
    loyalty: -2,         // 6+ месяцев
    volume: -2,          // 500К+ оборот
    quality: -1,         // Рейтинг 4.7+
    program: 0,
    total: -5
  },
  
  surcharges: {
    quality: 0,          // Нет проблем
    operation: 0,
    finance: 0,
    total: 0
  },
  
  finalRate: 15,         // 20 - 5 + 0 = 15%
  amount: 90000          // От 600К = 90К комиссии
}
```

#### Пример 2: Проблемный магазин

```typescript
// Новый магазин, 2 месяца, оборот 200К, рейтинг 3.2
{
  baseRate: 22,          // Мясо и рыба
  
  discounts: {
    loyalty: 0,          // <3 месяцев
    volume: 0,           // <300К
    quality: 0,          // Рейтинг <4.7
    program: 0,
    total: 0
  },
  
  surcharges: {
    quality: +3,         // Рейтинг <3.5
    operation: +2,       // Отмены >10%
    finance: +2,         // Штрафы >5%
    total: +7
  },
  
  finalRate: 29,         // 22 - 0 + 7 = 29%
  amount: 58000          // От 200К = 58К комиссии
}
```

---

## 5. Индивидуальные условия

### Фиксированная ставка

```typescript
{
  type: "FIXED_RATE",
  rate: 15,  // Фиксированные 15%
  period: {
    from: "2024-01-01",
    to: "2024-12-31"
  },
  reason: "Договор с крупным партнёром",
  approvedBy: platformAdmin
}
```

### Прогрессивная шкала

```typescript
{
  type: "PROGRESSIVE",
  tiers: [
    { from: 0, to: 300000, rate: 25 },
    { from: 300001, to: 1000000, rate: 20 },
    { from: 1000001, to: null, rate: 15 }
  ],
  reason: "Стимулирование роста"
}
```

### Категориальные скидки

```typescript
{
  type: "CATEGORY_DISCOUNT",
  categories: {
    "PRODUCE": -5,      // Овощи-фрукты дешевле
    "READY_FOOD": +5    // Готовая еда дороже
  },
  reason: "Продвижение свежих продуктов"
}
```

---

## 6. Прозрачность для селлера

### Детализация в личном кабинете

```typescript
// Селлер видит полную разбивку
{
  period: "01.11 - 14.11.2024",
  
  revenue: 650000,
  
  commission: {
    base: "20% (Бакалея)",
    
    discounts: [
      "Стаж 7 месяцев: -2%",
      "Оборот 650К: -2%",
      "Рейтинг 4.8: -1%"
    ],
    
    surcharges: [
      "Отмены 12%: +2%"
    ],
    
    final: "17%",
    amount: "110 500₽"
  },
  
  breakdown: [
    { date: "01.11", orders: 45, revenue: 48000, commission: 8160 },
    { date: "02.11", orders: 52, revenue: 51000, commission: 8670 },
    // ...
  ]
}
```

### Прогноз комиссии

```typescript
// Калькулятор в личном кабинете
{
  currentRate: 17,
  
  improvements: [
    {
      condition: "Достигните оборота 1М",
      newRate: 16,
      saving: "10 000₽/мес"
    },
    {
      condition: "Поднимите рейтинг до 4.9",
      newRate: 16,
      saving: "6 500₽/мес"
    },
    {
      condition: "Снизьте отмены до 5%",
      newRate: 15,
      saving: "13 000₽/мес"
    }
  ]
}
```

---

## 7. Апелляции и корректировки

### Процесс апелляции

1. **Подача апелляции:**
   ```typescript
   {
     periodId: settlementPeriodId,
     reason: "INCORRECT_CALCULATION",
     description: "Не учтена скидка за участие в акции",
     expectedRate: 15,
     actualRate: 17
   }
   ```

2. **Рассмотрение:**
   - Проверка расчётов
   - Анализ условий договора
   - Проверка выполнения KPI

3. **Решение:**
   ```typescript
   {
     status: "APPROVED",
     newRate: 15,
     refund: 13000,
     comment: "Подтверждаем участие в акции"
   }
   ```

---

## Техническая сводка

### Модули

- `finance/commission` - расчёт комиссий
- `finance/commission-rules` - правила и условия
- `finance/individual-terms` - индивидуальные условия

### API

**Seller:**
- `GET /seller/commission` - текущие условия
- `GET /seller/commission/forecast` - прогноз
- `GET /seller/commission/history` - история
- `POST /seller/commission/appeal` - апелляция

**Platform:**
- `GET /platform/commission/rules` - все правила
- `POST /platform/commission/override` - переопределить
- `PATCH /platform/commission/appeal/:id` - решение по апелляции

### Бизнес-правила

1. **Минимальная комиссия:** 10% (защита платформы)
2. **Максимальная комиссия:** 40% (защита селлера)
3. **Минимальная сумма:** 50₽ с заказа
4. **Пересчёт:** при изменении условий со следующего периода
5. **Апелляция:** в течение 7 дней после закрытия периода
6. **Индивидуальные условия:** требуют одобрения руководства
7. **Прозрачность:** селлер всегда видит детализацию

---

## Связь с другими процессами

**Finance Flow:**
- Комиссия учитывается в SettlementPeriod
- Влияет на итоговую выплату селлеру

**Order Flow:**
- Каждый заказ → расчёт комиссии
- Отмены → влияют на ставку

**Support Flow:**
- Жалобы → повышение ставки
- Положительные отзывы → снижение

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-24