# Roadmap V2 — Общий план реализации

> Этапы разработки новой архитектуры FruktGo Backend.

---

## Обзор фаз

| Фаза | Название | Цель | Этапов | Длительность |
|------|----------|------|--------|--------------|
| **0** | [Фундамент](./phase-0/) | Инфра для масштабирования | 3 | ~1 неделя |
| **1** | [MVP Core](./phase-1/) | Каталог, заказы, доставка | 9 | 4-6 недель |
| **2** | [Money Flow](./phase-2/) | Платежи, финансы | 6 | 2-3 недели |
| **3** | [Engagement](./phase-3/) | Лояльность, маркетинг, споры | 5 | 2-3 недели |
| **4** | [Operations & Admin](./phase-4/) | Платформа, модерация, аудит | 6 | 2-3 недели |
| **5** | [Scale](./phase-5/) | Кэш, поиск, интеграции | 6 | Ongoing |

---

## Структура

```
phases/
├── README.md          # Этот файл
├── phase-0/           # Фундамент
│   ├── README.md
│   ├── stage-1.md     # Redis + BullMQ
│   ├── stage-2.md     # Структура проекта
│   └── stage-3.md     # Общие утилиты
├── phase-1/           # MVP Core
│   ├── README.md
│   ├── stage-1.md     # AUTH
│   ├── stage-2.md     # CUSTOMER, BUSINESS
│   ├── ...
│   └── stage-9.md     # Интеграция
├── phase-2/           # Money Flow
│   ├── README.md
│   └── stage-1..6.md
├── phase-3/           # Engagement
│   ├── README.md
│   └── stage-1..5.md  # + TrustScore
├── phase-4/           # Operations & Admin
│   ├── README.md
│   └── stage-1..6.md
└── phase-5/           # Scale
    ├── README.md
    └── stage-1..6.md
```

---

## Зависимости между фазами

```
Фаза 0 ──► Фаза 1 ──► Фаза 2 ──► Фаза 3 ──► Фаза 4
                          │                    │
                          └──────► Фаза 5 ◄────┘
```

- **Фаза 1** требует завершения **Фазы 0**
- **Фаза 2** требует ORDERS из **Фазы 1**
- **Фаза 3** требует CUSTOMER из **Фазы 1** и FINANCE из **Фазы 2**
- **Фаза 4** требует SUPPORT из **Фазы 3** (для споров в админке)
- **Фаза 5** может начинаться параллельно с **Фазой 4**

---

## Краткое содержание фаз

### Фаза 0: Фундамент
- Redis + BullMQ + EventBusPort
- Структура папок по архитектуре V2
- ESLint правила изоляции, Common утилиты

### Фаза 1: MVP Core
- AUTH, CUSTOMER (+ базовый TrustScore), BUSINESS
- CATALOG, STOREFRONT (LivePhotos), INVENTORY (OCC, базовые операции)
- ORDERS (FSM, Tolerance), WORKFORCE
- LOGISTICS, GEO, COMMUNICATIONS

### Фаза 2: Money Flow
- OrderPayment (ЮKassa, idempotency)
- ShopAccount, SellerAccount, PlatformAccount
- SettlementPeriod, Withdrawal, Penalty

### Фаза 3: Engagement
- LOYALTY (MemberCard, баллы, QR)
- MARKETING (промокоды, акции)
- REPUTATION (отзывы, рейтинги)
- SUPPORT (тикеты, **Dispute**, арбитраж)
- **CustomerTrustScore** полный

### Фаза 4: Operations & Admin
- PLATFORM (PlatformStaff, роли)
- Moderation (селлеры, магазины, товары)
- **Admin Panel** (своя, React)
- AUDIT (логирование, просмотр)
- ANALYTICS (базовые дашборды)
- INVENTORY расширенный (приёмка, инвентаризация)

### Фаза 5: Scale
- Redis Cache, ElasticSearch
- INTEGRATIONS (импорт/экспорт, webhooks)
- Logistics SLA, fallback провайдеры
- OpenTelemetry, Data Lifecycle

---

## Статус

| Фаза | README | Stages |
|------|--------|--------|
| 0 | ✅ | ✅ stage-1..3 |
| 1 | ✅ | ✅ stage-1..8 |
| 2 | ✅ | ⏳ Ожидает детализации |
| 3 | ✅ | ⏳ Ожидает детализации |
| 4 | ✅ | ⏳ Ожидает детализации |
| 5 | ✅ | ⏳ Ожидает детализации |
