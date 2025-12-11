# Architecture V2 — Модульная архитектура

> Переработанная архитектура с чёткой изоляцией модулей по бизнес-доменам.

## Обзор

Архитектура разделена на **5 групп** по функциональному назначению:

| Группа | Назначение | Модули |
|--------|------------|--------|
| **A** | Core Commerce | CATALOG, INVENTORY, ORDERS, STOREFRONT |
| **B** | Back-office | BUSINESS, WORKFORCE, FINANCE, PLATFORM |
| **C** | Engagement | CUSTOMER, MARKETING, LOYALTY, REPUTATION, SUPPORT |
| **D** | Infra & Data | AUTH, COMMUNICATIONS, MEDIA, AUDIT, ANALYTICS, INTEGRATIONS |
| **E** | Logistics | LOGISTICS, GEO |

---

## Слои архитектуры

```
┌─────────────────────────────────────────────────────────┐
│                   INTERFACE LAYER                        │
│   HTTP (Role APIs)  │  WebSockets  │  Telegram Bots     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                       │
│   RoleServices: права, DTO→Command, маппинг ошибок      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   PROCESS LAYER                          │
│   Orchestrators: кросс-модульные бизнес-процессы        │
│   (OrderProcess, CheckoutProcess, FinanceProcess)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER                          │
│   Модули групп A, B, C (бизнес-логика)                  │
│   Port + Service + Schema + Commands/Queries            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                     │
│   Модули группы D, E (инфра, внешние сервисы)           │
└─────────────────────────────────────────────────────────┘
```

### Правила зависимостей

```
Interface → Application → Process → Domain → Infrastructure
    ↓                                   ↓
  common ←─────────────────────────────┘

✅ Оркестраторы работают ТОЛЬКО через Ports модулей
✅ Модули общаются через Events или Ports
❌ Модули НЕ импортируют схемы других модулей напрямую
❌ Нет циклических зависимостей
```

### Ключевые инварианты

| Инвариант | Описание |
|-----------|----------|
| **city** | Все ключевые сущности (Order, ShopProduct, Stock) содержат `city` для изоляции данных между городами |
| **Idempotency** | Платежи и webhooks используют idempotency keys для защиты от дублей |
| **Int для денег** | Все суммы в копейках (Int), не float |
| **UTC даты** | Все даты в UTC, таймзона магазина отдельным полем |
| **No PII in logs** | Телефоны/адреса не логируются полностью |

---

## Группа A: Торговля (Core Commerce)

Ядро платформы — товары, остатки, заказы, витрина.

### CATALOG

**Назначение:** Мастер-данные товаров, категории, бренды, характеристики.

**Характеристики:**
- **Read-heavy** — высокая нагрузка на чтение
- Источник истины для карточек товаров
- Не хранит остатки и цены (это INVENTORY/STOREFRONT)

**Ответственность:**
- Категории и их иерархия (дерево)
- Бренды и производители
- Мастер-товары (Product) — описание, характеристики, медиа
- Атрибуты и фильтры (размер, цвет, материал)
- Варианты товаров (SKU)

**Входящие зависимости:**
- STOREFRONT читает для витрины
- INVENTORY ссылается на SKU
- ORDERS ссылается на товары

**Исходящие зависимости:**
- MEDIA — хранение изображений
- BUSINESS — привязка к магазину/селлеру

---

### INVENTORY

**Назначение:** Склады, остатки, партии, складские операции.

**Характеристики:**
- **Write-heavy** — частые операции изменения остатков
- **OCC** — Optimistic Concurrency Control через поле `version` (вместо тяжёлых транзакций)
- Источник истины для наличия товара

**Подмодули:**

#### Stock (остатки)
- Остатки (Stock) — количество по SKU на складе
- Резервирование (Reserve) — бронь под заказ
- Движения товара (StockMovement) — аудит

#### Batch (партии)
- Учёт сроков годности (expiresAt)
- Динамический срок хранения (зависит от условий)
- Пресеты хранения (температура, влажность, этилен)
- FEFO (принцип ротации)
- Себестоимость
- Алерты свежести — рекомендации (снизить цену, списать)

#### Operations (складские операции)
```typescript
StockOperation {
  shopId: ObjectId;
  type: OperationType;    // см. ниже
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  performedBy: ObjectId;  // Employee
  items: OperationItem[];
  createdAt: Date;
  completedAt?: Date;
}
```

**Типы операций:**
| Тип | Описание | MVP |
|-----|----------|-----|
| `receiving` | Приёмка товара от поставщика | — |
| `write_off` | Списание (порча, просрочка) | ✅ |
| `transfer` | Перемещение между складами | — |
| `adjustment` | Корректировка остатков | ✅ |
| `inventory` | Инвентаризация | — |
| `return` | Возврат на склад | — |

**Приёмка (Receiving):**
```typescript
Receiving {
  supplierId?: string;      // Поставщик
  invoiceNumber?: string;   // Номер накладной
  items: {
    productId: ObjectId;
    expectedQuantity: number;
    actualQuantity: number;
    batchInfo?: {
      expiresAt: Date;
      costPrice: number;    // себестоимость
    };
  }[];
}
```

**Инвентаризация (Inventory Check):**
```typescript
InventoryCheck {
  shopId: ObjectId;
  type: 'full' | 'partial' | 'category';
  status: 'planned' | 'in_progress' | 'completed';
  items: {
    productId: ObjectId;
    expectedQuantity: number;
    actualQuantity: number;
    discrepancy: number;    // расхождение
  }[];
  discrepancyTotal: number;
  approvedBy?: ObjectId;    // Seller/Admin
}
```

#### Warehouse (склады)
- Склады (Warehouse) — локации хранения (в MVP: 1 склад = 1 магазин)

**Входящие зависимости:**
- ORDERS резервирует и списывает остатки
- STOREFRONT запрашивает доступность

**Исходящие зависимости:**
- CATALOG — информация о SKU
- BUSINESS — привязка склада к магазину
- AUDIT — логирование операций

---

### ORDERS

**Назначение:** Чеки, корзины, история покупок.

**Характеристики:**
- Полный цикл заказа от корзины до завершения
- Event-driven для интеграций

**Ответственность:**
- Корзина (Cart) — сборка заказа
- Заказ (Order) — оформление, статусы, история
- Позиции заказа (OrderItem)
- Логика веса (Tolerance):
  - Допустимая погрешность (±10% по умолчанию)
  - Компенсация недовеса баллами (LOYALTY)
  - Перевес за счёт продавца
- Оплата (Payment) — интеграция с платёжными системами
- Возвраты (Refund) — частичные/полные
- События заказа (OrderEvent) — аудит

**Входящие зависимости:**
- CUSTOMER — кто заказывает
- STOREFRONT — откуда товары

**Исходящие зависимости:**
- INVENTORY — резервирование/списание
- FINANCE — записи транзакций
- LOGISTICS — создание доставки
- COMMUNICATIONS — уведомления

---

### STOREFRONT

**Назначение:** Витрина, поиск, листинги.

**Характеристики:**
- **Read-heavy** — оптимизация под быстрый поиск
- ElasticSearch для полнотекстового поиска
- Кэширование (Redis)

**Ответственность:**
- Листинги магазинов (ShopProduct) — цены, доступность
- Живые фотографии (LivePhotos):
  - Актуальные фото с прилавка
  - Дата съёмки
  - Показывают реальное состояние товара
- Поиск товаров (Search) — фильтры, сортировка
- Индексация (Indexer) — синхронизация с ES
- Рекомендации (Recommendations) — "похожие товары"
- SEO-данные — meta, canonical URLs

**Входящие зависимости:**
- Публичный API — покупатели
- ORDERS — выбор товаров

**Исходящие зависимости:**
- CATALOG — данные товаров
- INVENTORY — остатки
- BUSINESS — информация о магазинах

---

## Группа B: Управление и Операции (Back-office)

Бизнес-сущности продавцов, сотрудники, финансы, админка.

### BUSINESS

**Назначение:** Профили селлеров, настройки магазинов.

**Ответственность:**
- Селлер (Seller) — юрлицо, реквизиты, документы
- Магазин (Shop) — торговая точка селлера
- Настройки магазина — график, зоны доставки, минимальный заказ
- Подписки и тарифы

**Входящие зависимости:**
- Все модули группы A — привязка к магазину

**Исходящие зависимости:**
- FINANCE — биллинг селлера
- PLATFORM — KYC проверки

---

### WORKFORCE

**Назначение:** Сотрудники селлеров, смены, задачи, права доступа.

**Ответственность:**
- Сотрудник (Employee) — профиль работника магазина
- Смены (Shift) — рабочие периоды, SLA-снэпшоты
- Задачи (Task) — picking, packing, delivery, stock operations
- Роли и права (RBAC) — что может делать сотрудник
- Заявки на работу (JobApplication)

**Входящие зависимости:**
- ORDERS — кто собирает заказ
- LOGISTICS — кто доставляет

**Исходящие зависимости:**
- BUSINESS — привязка к магазину
- COMMUNICATIONS — уведомления сотрудникам

---

### FINANCE

**Назначение:** Биллинг, кошельки, транзакции, выплаты, налоги.

**Характеристики:**
- **ACID critical** — финансовая целостность
- Двойная запись (double-entry)

**Ответственность:**
- Кошелёк магазина (ShopAccount) — баланс, холды
- Кошелёк селлера (SellerAccount) — агрегация по магазинам
- Кошелёк платформы (PlatformAccount) — комиссии
- Транзакции (Transaction) — все движения денег
- Расчётные периоды (SettlementPeriod)
- Выплаты (Payout) — вывод на банк
- Штрафы (Penalty)
- Комиссии (Commission) — расчёт 10-40%

**Входящие зависимости:**
- ORDERS — оплата заказа

**Исходящие зависимости:**
- BUSINESS — привязка к селлеру
- INTEGRATIONS — банковские API

---

### PLATFORM

**Назначение:** Управление платформой, сотрудники, модерация, админ-панель.

**Подмодули:**

#### Staff (сотрудники платформы)
```typescript
PlatformStaff {
  email: string;
  phone?: string;
  name: string;
  roles: PlatformRole[];     // множественные роли
  status: 'active' | 'inactive';
  lastLoginAt: Date;
}
```

**Роли:**
| Роль | Доступ | MVP |
|------|--------|-----|
| `platform_admin` | Полный доступ | ✅ |
| `platform_finance` | Финансы, периоды, выплаты | — |
| `platform_support` | Поддержка, споры, возвраты | — |
| `platform_moderator` | Модерация товаров/отзывов | — |
| `platform_seller_manager` | Модерация селлеров, KYC | — |
| `platform_risk` | Антифрод, блокировки | — |

#### Moderation (модерация)
**Функции:**
- **Селлеры:** заявки, верификация (IS_CHECKING → VERIFIED), блокировка
- **Магазины:** активация, блокировка, контроль доступности
- **Каталог:** модерация товаров, скрытие нарушений
- **Отзывы:** модерация, удаление нарушающих

```typescript
ModerationAction {
  targetType: 'seller' | 'shop' | 'product' | 'review';
  targetId: ObjectId;
  action: 'approve' | 'reject' | 'block' | 'unblock' | 'hide';
  performedBy: ObjectId;  // PlatformStaff
  reason?: string;
  timestamp: Date;
}
```

#### Settings (настройки платформы)
- Базовая комиссия (%)
- Лимиты (min заказ, max вывод)
- Список городов (активные/планируемые)
- Feature flags

#### KYC (верификация)
- Проверка документов селлеров
- Статусы: `pending` → `checking` → `verified` / `rejected`

#### Admin Panel UI
> Своя админ-панель (React), не сторонние решения.

**Функции Admin Panel:**
| Раздел | Функции |
|--------|----------|
| Селлеры | Список, заявки, KYC, блокировки |
| Магазины | Список, активация, статистика |
| Заказы | Просмотр, проблемные кейсы, корректировки |
| Финансы | Периоды, штрафы/бонусы, выплаты |
| Поддержка | Тикеты, споры, возвраты |
| Каталог | Модерация товаров |
| Аудит | Логи действий, фильтры |
| Настройки | Комиссии, лимиты, города |

**Доступ:** `/api/platform/**` + `PlatformAuthGuard`

#### Content (контент)
- Статьи (Article) — блог, новости
- FAQ
- Правила платформы

**Входящие зависимости:**
- Все модули — администрирование

**Исходящие зависимости:**
- COMMUNICATIONS — уведомления о блокировках
- AUDIT — логирование всех действий
- ANALYTICS — дашборды

---

## Группа C: Взаимодействие (Engagement)

Клиенты, маркетинг, отзывы, поддержка.

### CUSTOMER

**Назначение:** CRM, профили покупателей, доверие.

**Ответственность:**
- Профиль покупателя (Customer) — имя, контакты
- Адреса доставки
- Избранное (Wishlist)
- История просмотров
- Сегментация для маркетинга
- **Рейтинг доверия (TrustScore):**
  ```typescript
  CustomerTrust {
    customerId: ObjectId;
    score: number;           // 0-100, начальный = 50
    totalOrders: number;
    completedOrders: number;
    disputesOpened: number;
    disputesWonByCustomer: number;
    disputesWonBySeller: number;
    fraudFlags: string[];    // подозрительные паттерны
    lastUpdated: Date;
  }
  ```
  - Автоматический пересчёт после каждого заказа/спора
  - Влияет на лимиты: низкий score → меньше бонусов, строже проверки
  - Используется в SUPPORT для арбитража (приоритет клиента при высоком score)

**Входящие зависимости:**
- ORDERS — кто заказывает
- MARKETING — таргетинг
- SUPPORT — TrustScore для арбитража

**Исходящие зависимости:**
- COMMUNICATIONS — уведомления

---

### MARKETING

**Назначение:** Акции, баннеры, рекламные кампании.

**Ответственность:**
- Промокоды (Promo) — скидки, условия
- Акции (Campaign) — "2 по цене 1", happy hours
- Баннеры — главная, категории
- Рекламные кампании селлеров
**Входящие зависимости:**
- ORDERS — применение скидок
- STOREFRONT — отображение акций

**Исходящие зависимости:**
- CUSTOMER — сегменты
- ANALYTICS — эффективность кампаний

---

### LOYALTY

**Назначение:** Программа лояльности, бонусы, баллы, карточки клиента.

**Ответственность:**
- Карточка клиента (MemberCard):
  ```typescript
  MemberCard {
    customerId: ObjectId;
    barcode: string;      // EAN-13, генерируется один раз
    balance: number;      // cents (source of truth)
    tier: 'standard' | 'silver' | 'gold';
  }
  ```
- Начисление баллов:
  - За недовес (tolerance compensation)
  - Кэшбэк с заказов
- Списание баллов при оплате
- Лимиты на использование (антиабьюз)
- QR endpoint: `GET /customer/card/qr → SVG`

**Адаптеры (по мере необходимости):**
- Apple Wallet, Google Wallet, Koshelek

**Входящие зависимости:**
- ORDERS — начисление/списание баллов
- REPUTATION — баллы за отзывы

**Исходящие зависимости:**
- CUSTOMER — привязка к клиенту
- COMMUNICATIONS — уведомления о баллах

---

### REPUTATION

**Назначение:** Отзывы, рейтинги, Q&A.

**Ответственность:**
- Отзывы на товары (ProductReview)
- Отзывы на магазины (ShopReview)
- Отзывы на курьеров (CourierReview)
- Рейтинги (агрегация)
- Вопросы о товарах (Q&A)
- Модерация отзывов

**Входящие зависимости:**
- ORDERS — проверка покупки перед отзывом
- STOREFRONT — отображение рейтингов

**Исходящие зависимости:**
- CUSTOMER — кто оставил отзыв
- PLATFORM — модерация
- LOYALTY — баллы за отзывы

---

### SUPPORT

**Назначение:** Тикетная система, чаты, арбитраж споров.

> ⚠️ **MVP:** Чаты через Telegram, не своя тикетница. Только сущность `Issue` для связки.

**Ответственность:**
- Тикеты (Issue) — обращения в поддержку (связка с Telegram)
- **Споры (Dispute):**
  ```typescript
  Dispute {
    orderId: ObjectId;
    customerId: ObjectId;
    shopId: ObjectId;
    reason: DisputeReason;    // quality, missing_item, wrong_item, damaged, weight_mismatch
    status: DisputeStatus;    // opened, under_review, resolved, escalated
    evidence: {
      customerPhotos: string[];
      customerComment: string;
      sellerPhotos: string[];
      sellerComment: string;
    };
    resolution: {
      decision: 'customer_favor' | 'seller_favor' | 'partial';
      refundAmount?: number;    // копейки
      bonusCompensation?: number;
      resolvedBy: ObjectId;     // PlatformStaff
      resolvedAt: Date;
      comment: string;
    };
    autoResolveEligible: boolean;  // можно ли авторазрешить
  }
  ```
- **Правила арбитража (DisputeRules):**
  - **Приоритет клиента:** при TrustScore > 70 и первом споре — автоматический возврат до 500₸
  - **Авторазрешение:** мелкие споры (<1000₸) при высоком TrustScore клиента
  - **Эскалация:** автоматически при сумме >5000₸ или повторных спорах
  - **Штрафы магазину:** при >3 проигранных спорах/месяц → повышение комиссии
  - **Защита от абьюза:** при TrustScore <30 — только ручное рассмотрение
- SLA и эскалация
- База знаний (FAQ)

**Входящие зависимости:**
- ORDERS — споры по заказам
- CUSTOMER — кто обращается, TrustScore

**Исходящие зависимости:**
- COMMUNICATIONS — уведомления
- FINANCE — возвраты по спорам
- LOYALTY — компенсация баллами
- AUDIT — логирование решений

---

## Группа D: Инфраструктура и Данные (Infra & Data)

Аутентификация, уведомления, медиа, аудит, аналитика, интеграции.

### AUTH

**Назначение:** Аутентификация и авторизация всех ролей.

**Характеристики:**
- **@Global()** — доступен всем модулям
- Stateless JWT

**Ответственность:**
- JWT токены (access, refresh)
- Одноразовые коды (OTP) для входа
- Telegram OAuth
- Guards: `JwtAuthGuard`, `TypeGuard`, `RolesGuard`
- Strategies: `JwtStrategy`
- Декораторы: `@GetUser()`, `@UserType()`, `@Roles()`

**Входящие зависимости:**
- Все модули — защита endpoints

**Исходящие зависимости:**
- CUSTOMER, BUSINESS, WORKFORCE, PLATFORM — проверка пользователей
- COMMUNICATIONS — отправка OTP

---

### COMMUNICATIONS

**Назначение:** Шлюз уведомлений.

**Ответственность:**
- Email — отправка через SMTP/SendGrid
- SMS — интеграция с провайдерами
- Push — мобильные/веб уведомления
- Telegram Bot — уведомления в TG
- Webhooks — для внешних систем
- Шаблоны сообщений
- Очередь отправки (Queue)

**Входящие зависимости:**
- Все модули — отправка уведомлений

**Исходящие зависимости:**
- Внешние сервисы (SendGrid, Twilio, FCM)

---

### MEDIA

**Назначение:** Загрузка и обработка файлов.

**Ответственность:**
- Загрузка файлов в S3/R2
- Оптимизация изображений (resize, compression)
- Генерация превью (thumbnails)
- CDN интеграция
- Очистка неиспользуемых файлов

**Входящие зависимости:**
- CATALOG — изображения товаров
- BUSINESS — логотипы магазинов
- REPUTATION — фото в отзывах

**Исходящие зависимости:**
- S3/R2 storage

---

### AUDIT

**Назначение:** Аудит-логирование критичных действий.

**Характеристики:**
- **Write-only** — логи не редактируются и не удаляются
- Immutable записи для юридической защиты
- Возможна репликация в SIEM

**Схема:**
```typescript
AuditLog {
  _id: ObjectId;
  timestamp: Date;
  
  // Кто
  actor: {
    type: 'customer' | 'seller' | 'employee' | 'platform_staff' | 'system';
    id: ObjectId;
    name?: string;
    ip?: string;
  };
  
  // Что
  action: AuditAction;         // см. ниже
  category: AuditCategory;     // finance, moderation, inventory, order, auth, settings
  
  // Над чем
  target: {
    type: string;              // order, shop, seller, product, etc.
    id: ObjectId;
  };
  
  // Детали
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  
  // Контекст
  requestId?: string;          // для трейсинга
  sessionId?: string;
}
```

**Категории и действия:**
| Категория | Действия |
|----------|----------|
| `finance` | payout_created, payout_approved, penalty_applied, period_closed, refund_issued |
| `moderation` | seller_verified, seller_blocked, shop_activated, product_hidden, review_removed |
| `inventory` | stock_adjusted, write_off, receiving_completed, inventory_approved |
| `order` | order_cancelled_by_admin, order_refunded, dispute_resolved |
| `auth` | login_success, login_failed, password_changed, role_changed |
| `settings` | commission_changed, city_added, feature_flag_toggled |
| `support` | dispute_opened, dispute_escalated, dispute_resolved |

**Ответственность:**
- Запись логов через `AuditPort.log()`
- Просмотр в Admin Panel с фильтрами
- Ретенция: 2 года (финансы), 1 год (остальное)
- Архивация в cold storage

**Входящие зависимости:**
- PLATFORM — действия админов
- FINANCE — финансовые операции
- INVENTORY — складские операции
- ORDERS — изменения статусов
- SUPPORT — споры и решения

**Исходящие зависимости:**
- MongoDB (primary storage)
- ClickHouse (для аналитики, опционально)

---

### ANALYTICS

**Назначение:** Сбор данных и дашборды.

**Ответственность:**
- События (Event) — просмотры, клики, добавления в корзину
- ETL — агрегация из ORDERS, CATALOG
- Дашборды админов:
  - GMV (Gross Merchandise Value)
  - Revenue
  - Активность пользователей
- Дашборды селлеров:
  - Воронка продаж
  - Конверсия
  - Популярные товары
- Экспорт отчётов

**Входящие зависимости:**
- Все модули — события

**Исходящие зависимости:**
- ClickHouse/TimescaleDB — хранение событий
- ElasticSearch — логи

---

### INTEGRATIONS

**Назначение:** Внешние интеграции и API.

**Ответственность:**
- Public API Gateway — для ERP (1C, SAP)
- Импорт товаров (YML, CSV, Excel)
- Экспорт фидов (Яндекс.Маркет, Google Shopping)
- Webhooks для селлеров:
  - Новый заказ
  - Изменение статуса
  - Возврат
- OAuth для внешних сервисов

**Входящие зависимости:**
- CATALOG — импорт товаров
- ORDERS — webhooks

**Исходящие зависимости:**
- Внешние API

---

## Группа E: Логистика и Реальный мир (Logistics & Real World)

Доставка, геолокация, ПВЗ.

### LOGISTICS

**Назначение:** Fulfillment, доставка, трекинг.

**Подмодули:**

#### Fulfillment
- Маршрутизация внутри склада
- Сборка заказов
- Упаковка

#### Delivery
- Интеграция с 3PL (СДЭК, Почта, DPD, Uber)
- Свой автопарк (если есть)
- Расчёт стоимости доставки
- Создание накладных

#### Tracking
- Агрегация статусов от разных служб
- Единый трек для покупателя
- Webhook обновления статуса

#### Pickup Points
- Сеть ПВЗ и постаматов
- Интеграция с партнёрами (Boxberry, 5Post)
- Управление своими точками

**Входящие зависимости:**
- ORDERS — создание доставки

**Исходящие зависимости:**
- GEO — расчёт расстояний
- COMMUNICATIONS — уведомления о доставке

---

### GEO

**Назначение:** Карты, геокодинг, зоны доставки.

**Подмодули:**

#### Mapping
- Прокси для карт (Google/Yandex/OSM)
- Отображение на фронте

#### Geocoding
- Нормализация адресов
- Конвертация адрес ↔ координаты
- Интеграция с DaData

#### Zones
- Полигоны зон доставки
- Рисование зон на карте (админка селлера)
- Расчёт принадлежности точки зоне
- Ценообразование по зонам

**Входящие зависимости:**
- BUSINESS — настройка зон магазина
- LOGISTICS — расчёт маршрутов

**Исходящие зависимости:**
- Внешние API (DaData, Google Maps, Yandex Maps)

---

## Коммуникация между модулями

### Синхронная (Ports)

```typescript
// Модуль экспортирует порт
export interface CatalogPort {
  getProduct(query: GetProductQuery): Promise<Product>;
  getProducts(query: GetProductsQuery): Promise<Product[]>;
}

// Другой модуль инжектит через DI
@Inject(CATALOG_PORT) private readonly catalogPort: CatalogPort
```

### Асинхронная (Events)

> ⚠️ **Важно:** Для масштабирования (>1 инстанса) использовать **BullMQ** (Redis) вместо локального EventEmitter2.

```typescript
// EventBusPort — абстракция над брокером
export interface EventBusPort {
  emit(event: string, payload: any): Promise<void>;
}

// BullMQ для прода, EventEmitter для локальной разработки
@Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort

await this.eventBus.emit('order.created', { orderId, ... });
```

**Очереди по приоритету:**
- `high` — заказы, платежи (retry: 3, backoff: exponential)
- `default` — уведомления
- `low` — аналитика, отчёты

### Правила коммуникации

1. **Запрещено:** Прямой импорт схем/сервисов между модулями
2. **Разрешено:** Только через порты и события
3. **Транзакции:** Только внутри одного модуля (или через Saga)
4. **Eventual consistency:** Между модулями через события

---

## Telegram Bots

Боты являются частью Interface Layer и используют COMMUNICATIONS для отправки уведомлений.

| Бот | Роль | Функции |
|-----|------|----------|
| `@fruktgo_bot` | Customer | Авторизация, уведомления о заказах |
| `@fruktgo_seller_bot` | Seller/Employee | Вход в панель, уведомления о заказах, сменах |
| `@fruktgo_admin_bot` | Platform | Алерты, критические уведомления |

---

## Process Orchestrators

Оркестраторы координируют кросс-модульные бизнес-процессы.

| Оркестратор | Модули | Операции |
|-------------|--------|----------|
| **CheckoutProcess** | ORDERS, INVENTORY, LOYALTY, FINANCE | Создание заказа из корзины |
| **OrderProcess** | ORDERS, INVENTORY, WORKFORCE, LOGISTICS | Жизненный цикл заказа |
| **FinanceProcess** | FINANCE, ORDERS, LOYALTY | Закрытие периодов, выплаты |
| **InventoryProcess** | INVENTORY, CATALOG, STOREFRONT | Приёмка, списания, инвентаризация |
| **DisputeProcess** | SUPPORT, ORDERS, FINANCE, LOYALTY | Споры и возвраты |

**Правила:**
- Работают ТОЛЬКО через Ports модулей
- **FSM** для статусов — явная машина состояний вместо if/else
- События через EventBus (BullMQ)
- Saga pattern для кросс-модульных операций (компенсации при ошибках)

**FSM пример:**
```typescript
const OrderTransitions = {
  [OrderStatus.CREATED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.ASSEMBLING, OrderStatus.REFUNDED],
  // Запрещённые переходы выбросят ошибку
};
```

---

## Миграция с V1

| V1 | V2 | Примечания |
|----|-----|-----------|
| `product` | `CATALOG` | + категории, бренды |
| `shop-product` | `STOREFRONT` | + поиск, рекомендации, LivePhotos |
| `shop` | `BUSINESS.Shop` | |
| `seller` | `BUSINESS.Seller` | |
| `customer` | `CUSTOMER` | |
| `employee` | `WORKFORCE.Employee` | |
| `shift` | `WORKFORCE.Shift` | + Task |
| `job-application` | `WORKFORCE.JobApplication` | |
| `order` | `ORDERS` | + Tolerance логика |
| `cart` | `ORDERS.Cart` | |
| `finance/*` | `FINANCE` | |
| `issue` | `SUPPORT.Issue` | + Chat, Dispute |
| `article` | `PLATFORM.Article` | |
| `images` | `MEDIA` | |
| `addresses` | `GEO.Geocoding` | |
| `logs` | `AUDIT` | Аудит-логи |
| `notification` | `COMMUNICATIONS` | + Telegram Bots |
| `auth` | `AUTH` | |
| `access` | Распределён по модулям | |
| — | `LOYALTY` | Новый модуль |
| — | `REPUTATION` | Новый модуль |
| — | `ANALYTICS` | Новый модуль |
| — | `INTEGRATIONS` | Новый модуль |
| — | `LOGISTICS` | Новый модуль |

---

## TODO

### Фаза 0: Инфраструктура
- [ ] Setup Redis + BullMQ модуль
- [ ] EventBusPort абстракция
- [ ] ESLint правила изоляции модулей
- [ ] Common утилиты (City, Money, DomainError)

### Фаза 1: MVP Core
- [ ] AUTH: JWT, OTP, Telegram OAuth
- [ ] CUSTOMER: профили, адреса, TrustScore (базовый)
- [ ] BUSINESS: селлеры, магазины
- [ ] CATALOG, STOREFRONT: категории, товары, витрина, LivePhotos
- [ ] INVENTORY: остатки, OCC, резервирование, базовые операции (write_off, adjustment)
- [ ] ORDERS: корзина, checkout, FSM статусов, Tolerance
- [ ] WORKFORCE: сотрудники, смены
- [ ] LOGISTICS, GEO: доставка, зоны, геокодинг
- [ ] COMMUNICATIONS: Telegram, SMS, BullMQ очередь
- [ ] E2E интеграция, BFF endpoints

### Фаза 2: Money Flow
- [ ] FINANCE: платежи (ЮKassa), кошельки, комиссии
- [ ] Расчётные периоды, выплаты
- [ ] Штрафы, возвраты
- [ ] Idempotency keys
- [ ] Feature flags

### Фаза 3: Engagement
- [ ] LOYALTY: MemberCard, баллы, QR
- [ ] MARKETING: промокоды, акции
- [ ] REPUTATION: отзывы, рейтинги
- [ ] SUPPORT: тикеты, споры (Dispute), арбитраж
- [ ] CustomerTrustScore полный

### Фаза 4: Operations & Admin
- [ ] PLATFORM: PlatformStaff, роли, Admin Panel
- [ ] Moderation: селлеры, магазины, товары
- [ ] KYC верификация
- [ ] AUDIT: логирование, просмотр
- [ ] ANALYTICS: дашборды
- [ ] INVENTORY расширенный: приёмка, инвентаризация, перемещения

### Фаза 5: Scale
- [ ] Redis Cache для STOREFRONT
- [ ] ElasticSearch (до этого MongoDB Atlas Search)
- [ ] INTEGRATIONS: импорт/экспорт, webhooks
- [ ] Logistics SLA + fallback провайдеры
- [ ] OpenTelemetry полный
