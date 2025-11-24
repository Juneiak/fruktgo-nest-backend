# Процесс: Аналитика и дашборды

**Участники:** PlatformStaff, AnalyticsManager, Seller, DataAnalyst  
**Зависимости:** Analytics Module, BI Tools, Data Warehouse, Reporting Module

---

## Краткое содержание

### Основная идея

Платформа собирает **все данные** (заказы, клиенты, товары, финансы, маркетинг) и визуализирует их в виде **дашбордов** для разных ролей. **Админы** видят общую картину платформы (выручка, GMV, количество магазинов). **Продавцы** видят аналитику своих магазинов (продажи, топ товаров, конверсию). Используется **предиктивная аналитика** (прогноз спроса, рекомендации по остаткам). Все отчёты можно экспортировать.

**Схема:** События в системе → сбор данных → агрегация → визуализация в дашбордах → экспорт отчётов.

### Ключевая логика

**Уровни аналитики:**
- **Platform Dashboard** (админы) — общая выручка, комиссия, количество заказов, магазинов, клиентов
- **Shop Dashboard** (продавцы) — продажи магазина, топ товаров, конверсия, рейтинг
- **Product Analytics** — какие товары продаются лучше, списания, остатки
- **Customer Analytics** — поведение клиентов, сегменты, LTV, churn
- **Marketing Analytics** — эффективность промокодов, акций, ROI кампаний

**Platform Dashboard (для админов):**
- **Финансы**: выручка (сегодня/неделя/месяц), комиссия платформы, рост к прошлому периоду
- **Заказы**: количество, средний чек, статусы (в работе, доставлено, отменено)
- **Пользователи**: активные клиенты, новые регистрации, магазины, сотрудники
- **Качество**: рейтинг магазинов, количество споров, время доставки
- **Воронка**: конверсия визит→корзина→заказ→оплата→доставка

**Shop Dashboard (для продавцов):**
- **Продажи**: выручка, количество заказов, средний чек
- **Топ товары**: самые продаваемые, самые прибыльные
- **Остатки**: что заканчивается, что залежалось
- **Производительность**: время принятия заказа, время сборки, рейтинг
- **Финансы**: текущий расчётный период, комиссия, штрафы, прогноз выплаты

**Предиктивная аналитика (ML):**
- **Прогноз спроса** — на основе истории продаж предсказывается спрос на следующую неделю
- **Рекомендации по остаткам** — сколько товара закупить, чтобы не было недостачи/излишков
- **Сегментация клиентов** — кто может уйти (churn prediction), кто VIP
- **Оптимизация цен** — какую цену установить для максимизации выручки

**Кастомные отчёты:**
- Продавец/админ может создать свой отчёт с нужными метриками
- Выбор периода, фильтры, группировка
- Сохранение отчёта для повторного использования
- Экспорт в Excel/PDF/CSV

### Real-time vs исторические

Некоторые метрики обновляются в **real-time** (количество активных заказов, курьеры на линии), другие — раз в час/день (финансовые сводки, топ товары). Дашборды автоматически обновляются через WebSocket.

---

## Обзор

Комплексная система сбора, обработки и визуализации данных для принятия бизнес-решений на всех уровнях платформы.

**Принципы:**
- Real-time и исторические данные
- Многоуровневая аналитика (платформа, магазин, товар)
- Автоматические инсайты и рекомендации
- Кастомизируемые дашборды
- Экспорт отчётов (PDF, Excel, CSV)
- Прогнозирование на основе ML

**Уровни аналитики:**
- **Platform-level** - общая аналитика платформы (админы)
- **Shop-level** - аналитика магазина (селлеры)
- **Product-level** - аналитика товаров
- **Customer-level** - поведение клиентов
- **Marketing-level** - эффективность кампаний

---

## 1. Platform Dashboard (администраторы)

**Актор:** PlatformStaff, AnalyticsManager

### Основные метрики

#### Финансовые показатели

```typescript
{
  revenue: {
    total: 15000000,        // Общая выручка (₽)
    commission: 3000000,    // Комиссия платформы
    growth: +25,            // Рост к предыдущему периоду (%)
    
    byPeriod: {
      today: 500000,
      week: 3200000,
      month: 15000000
    },
    
    forecast: {
      nextMonth: 18000000,  // Прогноз на следующий месяц
      confidence: 85        // Уверенность прогноза (%)
    }
  },
  
  gmv: {                    // Gross Merchandise Value
    total: 75000000,        // Общий объём продаж
    avgOrderValue: 2500,    // Средний чек
    growth: +18
  },
  
  costs: {
    delivery: 1200000,      // Затраты на доставку
    marketing: 800000,      // Маркетинг
    support: 400000,        // Поддержка
    refunds: 300000         // Возвраты
  }
}
```

**Визуализация:**
```
┌─────────────────────────────────────────────┐
│ Выручка за месяц                            │
│                                             │
│ 15M₽  (+25% к пред. месяцу)                │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░ 75%                   │
│                                             │
│ График:                                     │
│     ╱╲                                      │
│    ╱  ╲      ╱╲                             │
│   ╱    ╲    ╱  ╲    ╱                       │
│  ╱      ╲  ╱    ╲  ╱                        │
│ ╱        ╲╱      ╲╱                         │
│ 1  7  14  21  28 (дни)                      │
└─────────────────────────────────────────────┘
```

#### Операционные метрики

```typescript
{
  orders: {
    total: 6000,
    completed: 5400,        // 90%
    cancelled: 300,         // 5%
    inProgress: 300,        // 5%
    
    avgProcessingTime: 25,  // минут
    onTimeDelivery: 92,     // %
    
    byStatus: {
      PENDING: 50,
      ACCEPTED: 100,
      IN_ASSEMBLY: 80,
      READY: 40,
      IN_DELIVERY: 30,
      DELIVERED: 5400,
      CANCELLED: 300
    }
  },
  
  users: {
    total: 25000,
    active: 8000,           // Активных за месяц
    new: 1200,              // Новых за месяц
    retention: 65,          // % возвращаемости
    churnRate: 12,          // % оттока
    
    bySegment: {
      NEW: 1200,
      ACTIVE: 6800,
      VIP: 1500,
      CHURNING: 2000
    }
  },
  
  shops: {
    total: 150,
    active: 120,
    avgRating: 4.6,
    topPerformers: [...]    // ТОП-10 магазинов
  }
}
```

#### Качество сервиса

```typescript
{
  quality: {
    avgRating: 4.7,
    nps: 72,                // Net Promoter Score
    
    disputes: {
      total: 45,
      resolved: 40,
      pending: 5,
      avgResolutionTime: 24  // часов
    },
    
    support: {
      tickets: 230,
      avgResponseTime: 15,   // минут
      satisfactionRate: 88   // %
    },
    
    delivery: {
      onTime: 92,            // %
      avgTime: 38,           // минут
      courierRating: 4.8
    }
  }
}
```

**API:** `GET /platform/analytics/dashboard`

---

## 2. Shop Dashboard (продавцы)

**Актор:** Seller

### Основные метрики для магазина

```typescript
{
  sales: {
    total: 450000,          // Продажи за период
    orders: 180,
    avgOrderValue: 2500,
    growth: +15,
    
    topProducts: [
      { name: "Яблоки Голден", revenue: 85000, units: 425 },
      { name: "Бананы", revenue: 65000, units: 520 },
      // ...
    ],
    
    byCategory: {
      "Фрукты": 280000,
      "Овощи": 120000,
      "Ягоды": 50000
    },
    
    byHour: [              // Распределение по часам дня
      { hour: 9, orders: 15 },
      { hour: 10, orders: 22 },
      { hour: 11, orders: 28 },
      // ...
    ]
  },
  
  commission: {
    rate: 20,              // Текущая ставка (%)
    paid: 90000,           // Уплачено комиссии
    adjustments: {
      quality: -1,         // Скидка за качество
      volume: -1,          // Скидка за объём
      total: -2
    }
  },
  
  inventory: {
    totalValue: 380000,    // Стоимость остатков
    lowStock: 12,          // Товаров с низким остатком
    outOfStock: 3,         // Нет в наличии
    turnoverRate: 8.5      // Оборачиваемость (раз в месяц)
  },
  
  customers: {
    total: 850,
    returning: 420,        // 49%
    avgLifetimeValue: 8500,
    
    topCustomers: [...]    // ТОП-20 клиентов
  },
  
  performance: {
    rating: 4.7,
    reviews: 234,
    responseRate: 78,      // % ответов на отзывы
    
    sla: {
      acceptance: 95,      // % принятых вовремя
      assembly: 92,        // % собранных вовремя
      avgAcceptanceTime: 8 // минут
    }
  }
}
```

**Визуализация для селлера:**

```
┌─────────────────────────────────────────────┐
│ Мой магазин: Фруктовая база                 │
│                                             │
│ Продажи за неделю:  450K₽ (+15% ⬆)         │
│ Заказов:            180                     │
│ Средний чек:        2,500₽                  │
│ Рейтинг:            ⭐4.7 (234 отзыва)      │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ ТОП-5 товаров:                              │
│ 1. Яблоки Голден      85K₽ (425 шт)        │
│ 2. Бананы             65K₽ (520 шт)        │
│ 3. Груши              45K₽ (300 шт)        │
│ 4. Апельсины          38K₽ (190 шт)        │
│ 5. Мандарины          32K₽ (256 шт)        │
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ ⚠ Рекомендации:                             │
│ • 12 товаров на исходе (пополните запас)   │
│ • Ответьте на 8 новых отзывов               │
│ • Обновите цены на сезонные фрукты          │
└─────────────────────────────────────────────┘
```

**API:** `GET /seller/analytics/dashboard`

---

## 3. Product Analytics (аналитика товаров)

**Актор:** Seller, PlatformStaff

### Детальная аналитика товара

```typescript
{
  product: {
    id: productId,
    name: "Яблоки Голден",
    category: "Фрукты"
  },
  
  sales: {
    units: 425,
    revenue: 85000,
    avgPrice: 200,
    
    trend: {
      daily: [120, 135, 98, 142, 155, 180, 195],
      growth: +18
    },
    
    conversionRate: 12,    // % добавлений в корзину → покупка
    
    byShop: [
      { shop: "Фруктовая база", units: 250, revenue: 50000 },
      { shop: "Fruit Market", units: 175, revenue: 35000 }
    ]
  },
  
  inventory: {
    currentStock: 125,
    avgDailyDemand: 60,
    daysOfStock: 2,        // Дни до исчерпания
    reorderPoint: 50,
    
    movements: [           // История движения
      { date: "2024-12-01", type: "SALE", quantity: -60 },
      { date: "2024-12-01", type: "RESTOCK", quantity: +200 },
      // ...
    ]
  },
  
  pricing: {
    current: 200,
    min: 180,              // За период
    max: 220,
    avgMarket: 210,        // Средняя по рынку
    
    elasticity: -1.5,      // Ценовая эластичность
    
    recommendations: {
      optimal: 205,        // Оптимальная цена
      expectedRevenue: 92000
    }
  },
  
  quality: {
    rating: 4.8,
    reviews: 89,
    returnRate: 2,         // % возвратов
    
    topComments: [
      "Свежие и сладкие",
      "Отличное качество",
      "Быстро портятся"
    ]
  },
  
  competition: {
    competitorCount: 8,
    pricePosition: "MIDDLE",  // LOW | MIDDLE | HIGH
    marketShare: 15           // %
  }
}
```

**Рекомендации на основе аналитики:**

```typescript
{
  insights: [
    {
      type: "RESTOCK_URGENTLY",
      message: "Яблоки Голден закончатся через 2 дня",
      action: "Пополните запас на 200+ кг",
      priority: "HIGH"
    },
    {
      type: "PRICE_OPTIMIZATION",
      message: "Цена ниже рынка на 10₽",
      action: "Поднимите цену до 205₽ для +8% выручки",
      priority: "MEDIUM"
    },
    {
      type: "PROMOTION_OPPORTUNITY",
      message: "Высокий спрос, но низкая конверсия",
      action: "Запустите акцию -10% для увеличения продаж",
      priority: "MEDIUM"
    }
  ]
}
```

**API:** `GET /analytics/products/:id`

---

## 4. Customer Analytics (поведение клиентов)

**Актор:** PlatformStaff, MarketingManager

### Анализ клиентской базы

```typescript
{
  segmentation: {
    NEW_USERS: {
      count: 1200,
      avgFirstOrder: 1800,
      conversionRate: 45,    // % завершивших первый заказ
      retention30Days: 35    // % вернувшихся через 30 дней
    },
    
    ACTIVE: {
      count: 6800,
      avgOrderFrequency: 4.2,  // раз в месяц
      avgOrderValue: 2500,
      ltv: 105000              // Lifetime Value
    },
    
    VIP: {
      count: 1500,
      avgOrderValue: 4200,
      avgOrderFrequency: 8,
      ltv: 336000,
      churnRisk: 5             // % риска оттока
    },
    
    CHURNING: {
      count: 2000,
      daysSinceLastOrder: 45,
      winBackRate: 22          // % успешного возврата
    }
  },
  
  behavior: {
    topCategories: [
      { name: "Фрукты", orders: 3200 },
      { name: "Овощи", orders: 2100 },
      { name: "Ягоды", orders: 1400 }
    ],
    
    shoppingPatterns: {
      avgTimeOnSite: 8.5,      // минут
      avgItemsPerOrder: 6,
      avgBrowseToOrder: 2.3,   // дней
      peakHours: [18, 19, 20]  // часы пик заказов
    },
    
    deviceUsage: {
      mobile: 65,
      desktop: 25,
      tablet: 10
    }
  },
  
  cohortAnalysis: {
    // Когорта пользователей зарегистрированных в ноябре
    cohort: "2024-11",
    retention: {
      week1: 45,
      week2: 32,
      week3: 28,
      week4: 25
    }
  }
}
```

**Сегментация для таргетинга:**

```typescript
// Автоматическая сегментация для маркетинговых кампаний
const segments = {
  highValueUsers: {
    criteria: "ltv > 200000 AND avgOrderValue > 3000",
    count: 450,
    strategy: "Эксклюзивные предложения"
  },
  
  atRiskUsers: {
    criteria: "daysSinceLastOrder > 30 AND previousFrequency > 4",
    count: 1200,
    strategy: "Win-back кампания с 20% скидкой"
  },
  
  bargainHunters: {
    criteria: "usesPromoCode > 80% AND avgOrderValue < 2000",
    count: 2100,
    strategy: "Промокоды и акции"
  }
};
```

**API:** `GET /platform/analytics/customers`

---

## 5. Marketing Analytics (эффективность кампаний)

**Актор:** MarketingManager

### Анализ маркетинговых активностей

```typescript
{
  campaigns: [
    {
      id: "black_friday_2024",
      name: "Чёрная пятница",
      type: "SALE",
      
      budget: {
        planned: 500000,
        spent: 480000,
        roi: 3.5            // Return on Investment
      },
      
      performance: {
        impressions: 150000,
        clicks: 12000,
        ctr: 8,             // Click-Through Rate (%)
        orders: 1200,
        conversionRate: 10, // %
        revenue: 1680000
      },
      
      attribution: {
        direct: 400,        // Прямые заходы
        organic: 300,
        paid: 500           // Платная реклама
      }
    }
  ],
  
  promoCodes: [
    {
      code: "FRUIT2024",
      
      usage: {
        totalUses: 850,
        uniqueUsers: 720,
        revenue: 2125000,
        discount: 425000
      },
      
      efficiency: {
        costPerOrder: 500,
        roi: 4.2,
        incrementalRevenue: 1700000  // Доп. выручка благодаря коду
      }
    }
  ],
  
  channels: {
    telegram: {
      subscribers: 12000,
      engagement: 25,      // %
      ordersFromChannel: 2400,
      revenue: 6000000
    },
    
    instagram: {
      followers: 8500,
      engagement: 18,
      ordersFromChannel: 850,
      revenue: 2125000
    },
    
    googleAds: {
      spend: 180000,
      clicks: 15000,
      cpc: 12,             // Cost Per Click
      orders: 450,
      revenue: 1125000,
      roas: 6.25           // Return on Ad Spend
    }
  }
}
```

**Воронка конверсии:**

```
100% Показы (150K)
  │
  ↓ 8% CTR
  │
12K Клики
  │
  ↓ 50% добавили в корзину
  │
6K В корзине
  │
  ↓ 20% оформили заказ
  │
1.2K Заказов
  │
  ↓ 95% оплатили
  │
1.14K Завершённых заказов
```

**API:** `GET /platform/analytics/marketing`

---

## 6. Predictive Analytics (прогнозирование)

**Актор:** DataAnalyst, PlatformStaff

### ML-модели для прогнозов

```typescript
{
  demandForecasting: {
    product: "Яблоки Голден",
    
    predictions: {
      tomorrow: {
        demand: 65,
        confidence: 88
      },
      nextWeek: [58, 62, 70, 75, 82, 90, 65],
      nextMonth: 2100
    },
    
    seasonality: {
      trend: "GROWING",
      weeklyPattern: "Пик в выходные",
      monthlyPattern: "Спад в середине месяца"
    },
    
    recommendations: [
      "Увеличьте запас на 20% к выходным",
      "Ожидается рост спроса на 15% в декабре"
    ]
  },
  
  churnPrediction: {
    atRiskUsers: [
      {
        userId,
        churnProbability: 75,
        reasons: ["Давно не заказывал", "Снизилась частота"],
        recommendedAction: "Win-back с персональной скидкой 20%"
      }
    ]
  },
  
  priceOptimization: {
    product: "Бананы",
    
    currentPrice: 180,
    optimalPrice: 195,
    
    impact: {
      revenueChange: +12,
      demandChange: -5,
      profitChange: +18
    }
  },
  
  inventoryOptimization: {
    product: "Груши",
    
    currentStock: 80,
    optimalStock: 120,
    reorderPoint: 40,
    safetyStock: 30,
    
    costSavings: 8500  // При оптимизации
  }
}
```

**API:** `GET /platform/analytics/predictions`

---

## 7. Кастомные отчёты

**Актор:** PlatformStaff, Seller

### Создание произвольных отчётов

```typescript
{
  reportName: "Продажи по категориям за Q4",
  
  filters: {
    dateRange: {
      from: "2024-10-01",
      to: "2024-12-31"
    },
    categories: ["Фрукты", "Овощи"],
    shops: [shopId1, shopId2],
    minRevenue: 10000
  },
  
  metrics: [
    "revenue",
    "orders",
    "avgOrderValue",
    "growth"
  ],
  
  groupBy: "category",
  sortBy: "revenue",
  
  format: "excel",  // excel | pdf | csv
  
  schedule: {
    frequency: "weekly",
    dayOfWeek: "monday",
    recipients: ["analyst@fruktgo.com"]
  }
}
```

**Пример сгенерированного отчёта:**

| Категория | Выручка | Заказов | Средний чек | Рост |
|-----------|---------|---------|-------------|------|
| Фрукты | 8,500,000₽ | 3,400 | 2,500₽ | +22% |
| Овощи | 4,200,000₽ | 2,100 | 2,000₽ | +15% |

**API:** `POST /platform/analytics/reports/custom`

---

## Техническая сводка

### Архитектура аналитики

```typescript
// Data Pipeline
Events → EventBus → Analytics Service → Data Warehouse → BI Tools
   ↓
Real-time metrics (Redis)
   ↓
Dashboards (WebSocket updates)
```

### Ключевые события для трекинга

```typescript
{
  eventType: "ORDER_COMPLETED",
  timestamp: Date,
  userId: ObjectId,
  sessionId: string,
  
  data: {
    orderId: ObjectId,
    totalAmount: number,
    items: [...],
    shop: ObjectId,
    deliveryType: string,
    promoCode?: string
  },
  
  context: {
    device: "mobile",
    platform: "ios",
    source: "organic",
    campaign?: string
  }
}
```

### API

**Platform:**
- `GET /platform/analytics/dashboard` - главный дашборд
- `GET /platform/analytics/revenue` - финансовая аналитика
- `GET /platform/analytics/customers` - клиентская аналитика
- `GET /platform/analytics/marketing` - маркетинг
- `GET /platform/analytics/predictions` - прогнозы ML
- `POST /platform/analytics/reports/custom` - кастомные отчёты
- `GET /platform/analytics/export` - экспорт данных

**Seller:**
- `GET /seller/analytics/dashboard` - дашборд магазина
- `GET /seller/analytics/sales` - продажи
- `GET /seller/analytics/products` - товары
- `GET /seller/analytics/customers` - клиенты магазина
- `GET /seller/analytics/performance` - производительность

**Product:**
- `GET /analytics/products/:id` - детальная аналитика товара
- `GET /analytics/products/:id/forecast` - прогноз спроса

### Интеграции

**Google Analytics:**
- Отслеживание поведения на сайте
- Воронки конверсии

**Amplitude:**
- Product analytics
- User journeys

**Metabase / Tableau:**
- BI визуализация
- Кастомные дашборды

---

## Примеры использования

### Получение dashboard данных

```typescript
const dashboard = await analyticsService.getDashboard({
  period: "month",
  metrics: ["revenue", "orders", "users", "quality"]
});

// Real-time обновление через WebSocket
socket.on("analytics-update", (data) => {
  updateDashboard(data);
});
```

### Прогноз спроса на товар

```typescript
const forecast = await analyticsService.predictDemand({
  productId,
  horizon: 7  // дней вперёд
});

// { predictions: [65, 70, 75, 82, 90, 95, 70], confidence: 88 }
```

### Экспорт отчёта

```typescript
const report = await analyticsService.exportReport({
  type: "sales",
  dateRange: { from: "2024-12-01", to: "2024-12-31" },
  format: "excel"
});

// Скачивание файла: sales_2024-12.xlsx
```

---

## Связь с другими процессами

**Order Flow:**
- Трекинг всех этапов заказа
- Метрики времени выполнения

**Finance Flow:**
- Финансовая аналитика
- Отчёты по комиссиям и выплатам

**Marketing Flow:**
- ROI кампаний
- Эффективность промокодов

**Inventory Flow:**
- Прогнозирование спроса
- Оптимизация запасов

**Rating Flow:**
- Анализ качества сервиса
- NPS и удовлетворённость

---

> **Статус:** ✅ Готов  
> **Обновлено:** 2024-11-24
