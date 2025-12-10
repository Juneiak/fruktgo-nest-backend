# Roadmap V2 — Общий план реализации

> Этапы разработки новой архитектуры FruktGo Backend.

---

## Обзор фаз

| Фаза | Название | Цель | Этапов | Длительность |
|------|----------|------|--------|--------------|
| **0** | [Фундамент](./phase-0/) | Инфра для масштабирования | 3 | ~1 неделя |
| **1** | [MVP Core](./phase-1/) | Каталог, заказы, доставка | 9 | 4-6 недель |
| **2** | [Money Flow](./phase-2/) | Платежи, финансы | 6 | 2-3 недели |
| **3** | [Engagement](./phase-3/) | Лояльность, маркетинг | 4 | 2-3 недели |
| **4** | [Scale](./phase-4/) | Кэш, поиск, аналитика | 6 | Ongoing |

---

## Структура

```
phases/
├── README.md          # Этот файл
├── phase-0/           # Фундамент
│   ├── README.md      # Обзор фазы + этапы
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
│   └── stage-1..4.md
└── phase-4/           # Scale
    ├── README.md
    └── stage-1..6.md
```

---

## Зависимости между фазами

```
Фаза 0 ──► Фаза 1 ──► Фаза 2 ──► Фаза 3
                          │
                          ▼
                      Фаза 4 (параллельно)
```

- **Фаза 1** требует завершения **Фазы 0**
- **Фаза 2** требует ORDERS из **Фазы 1**
- **Фаза 3** требует CUSTOMER из **Фазы 1** и FINANCE из **Фазы 2**
- **Фаза 4** может начинаться параллельно с **Фазой 3**

---

## Краткое содержание фаз

### Фаза 0: Фундамент
- Redis + BullMQ + EventBusPort
- Структура папок по архитектуре V2
- ESLint правила изоляции

### Фаза 1: MVP Core
- AUTH, CUSTOMER, BUSINESS
- CATALOG, STOREFRONT, INVENTORY
- ORDERS (FSM), WORKFORCE
- LOGISTICS, GEO, COMMUNICATIONS

### Фаза 2: Money Flow
- OrderPayment (ЮKassa, idempotency)
- ShopAccount, SellerAccount, PlatformAccount
- SettlementPeriod, Withdrawal, Penalty

### Фаза 3: Engagement
- LOYALTY (MemberCard, баллы)
- MARKETING (промокоды, акции)
- REPUTATION (отзывы)
- SUPPORT (тикеты через Telegram)

### Фаза 4: Scale
- Redis Cache, ElasticSearch
- ANALYTICS (ClickHouse)
- Logistics SLA, OpenTelemetry

---

## Статус

| Фаза | README | Stages |
|------|--------|--------|
| 0 | ✅ | ⏳ Ожидает утверждения |
| 1 | ✅ | ⏳ Ожидает утверждения |
| 2 | ✅ | ⏳ Ожидает утверждения |
| 3 | ✅ | ⏳ Ожидает утверждения |
| 4 | ✅ | ⏳ Ожидает утверждения |
