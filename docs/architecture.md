# FruktGo Backend Architecture

> Архитектура и концепции. Для практического руководства см. [tech-guidelines.md](./tech-guidelines.md).

## Содержание

- [1. Обзор](#1-обзор)
- [2. Архитектурные принципы](#2-архитектурные-принципы)
- [3. Структура проекта](#3-структура-проекта)
- [4. Модули](#4-модули)
- [5. Interface Layer](#5-interface-layer)
- [6. Authentication](#6-authentication)
- [7. Events](#7-events)
- [8. Data Flow](#8-data-flow)
- [9. Финансовая система](#9-финансовая-система)

---

## 1. Обзор

FruktGo — multi-tenant платформа для продуктовых магазинов на NestJS + MongoDB.

```
┌─────────────────────────────────────────────────────┐
│                  INTERFACE LAYER                     │
│   HTTP API  │  WebSockets  │  Telegram Bots         │
│  (по ролям) │  (по ролям)  │   (по ролям)           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                    │
│   RoleServices: DTO ↔ Commands, оркестрация, errors │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                   DOMAIN LAYER                       │
│   Customer │ Seller │ Shop │ Order │ Shift │ ...    │
│   (Port + Service + Schema + Commands/Queries)      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                INFRASTRUCTURE LAYER                  │
│   Images │ Addresses │ Logs │ Notifications │ Auth  │
└─────────────────────────────────────────────────────┘
                         ↓
                    MongoDB
```

### Роли в системе

| Роль | Описание | Endpoint |
|------|----------|----------|
| **Customer** | Клиенты (заказывают товары) | `/customer/*` |
| **Seller** | Продавцы (владельцы магазинов) | `/seller/*` |
| **Shop** | Магазины (точки продаж) | `/shop/*` |
| **Employee** | Сотрудники (работают в сменах) | `/employee/*` |
| **Admin** | Администраторы платформы | `/admin/*` |

Каждая роль имеет: HTTP API, WebSocket gateway, Telegram бот.

---

## 2. Архитектурные принципы

### Port-Based Architecture (Hexagonal)

Бизнес-логика изолирована через интерфейсы (Ports). Модули взаимодействуют только через Ports, не через конкретные сервисы.

**Преимущества:** тестируемость, замена реализации, четкие границы.

### CQRS

Разделение операций чтения (Queries) и записи (Commands).

**Преимущества:** явные намерения, раздельная оптимизация read/write.

### DDD Elements

- **Aggregates:** Customer, Seller, Shop, Order, Shift
- **Value Objects:** Address, Blocked, Statistics
- **Domain Events:** через EventEmitter2
- **Domain Errors:** `DomainError` с кодами

### Dependency Injection

- Ports через Symbol tokens
- Services через `useExisting`
- `@Global()` для общих модулей

---

## 3. Структура проекта

```
src/
├── modules/      # Доменные модули (бизнес-логика)
├── infra/        # Инфраструктурные модули
├── interface/    # HTTP, WS, Telegram
├── processes/    # Бизнес-процессы (оркестраторы)
├── common/       # Guards, decorators, utils
└── main.ts
```

**Правила зависимостей:**
```
interface → processes → modules → infra → database
    ↓                      ↓
  common ←────────────────┘

✅ Interface зависит от modules/processes
✅ Modules зависят от infra и других modules (через Ports)
✅ Infra независим от modules
❌ Modules НЕ зависят от interface
❌ Нет циклических зависимостей
```

---

## 4. Модули

### Domain Modules (`src/modules/`)

| Модуль | Описание |
|--------|----------|
| **customer** | Клиенты, профиль, адреса |
| **seller** | Продавцы, компании, верификация |
| **shop** | Магазины, связь с продавцами |
| **product** | Товары (мастер-каталог) |
| **shop-product** | Товары в магазинах, цены, остатки |
| **employee** | Сотрудники, прикрепление к магазинам |
| **order** | Заказы, статусы, доставка |
| **shift** | Смены, учет работы |
| **cart** | Корзина клиента |
| **issue** | Обращения в поддержку |
| **article** | Блог/статьи |
| **finance** | Счета, транзакции, выплаты |
| **job-application** | Заявки на работу |

### Infrastructure Modules (`src/infra/`)

| Модуль | Описание |
|--------|----------|
| **auth** | JWT, Guards, Strategies (`@Global()`) |
| **images** | Storage providers (S3, R2, Local) |
| **addresses** | Геокодирование, DaData |
| **logs** | Аудит-логирование |
| **notifications** | Push, Email, SMS, Telegram |
| **access** | Проверка прав доступа |

### Структура модуля

```
customer/
├── customer.schema.ts      # MongoDB схема
├── customer.service.ts     # Реализация (implements Port)
├── customer.port.ts        # Интерфейс + Symbol
├── customer.commands.ts    # Write операции
├── customer.queries.ts     # Read операции
├── customer.enums.ts       # Енумы
├── customer.module.ts      # NestJS модуль
└── index.ts                # Exports
```

---

## 5. Interface Layer

### HTTP API (`src/interface/http/`)

```
http/
├── admin/          # /admin/*
├── seller/         # /seller/*
├── customer/       # /customer/*
├── employee/       # /employee/*
├── shop/           # /shop/*
├── public/         # /public/* (без авторизации)
└── shared/         # Общие DTOs, base-responses
```

**Структура endpoint группы:**
```
admin/customers/
├── admin.customers.controller.ts
├── admin.customers.request.dtos.ts
├── admin.customers.response.dtos.ts
├── admin.customers.role.service.ts
└── admin.customers.api.module.ts
```

### WebSocket (`src/interface/ws/`)

Real-time обновления для каждой роли: уведомления о заказах, статусы, системные сообщения.

### Telegram Bots (`src/modules/telegram/`)

Отдельный бот для каждой роли: customer-bot, seller-bot, employee-bot, admin-bot.

---

## 6. Authentication

### JWT схема

```typescript
interface JwtPayload {
  id: string;           // User ID
  type: UserType;       // 'customer' | 'seller' | 'employee' | 'admin'
  iat: number;
  exp: number;          // 7 дней
}
```

### Процесс

1. `POST /customer/auth/send-code` — отправка 4-значного кода (TTL 5 мин)
2. `POST /customer/auth/verify-code` — верификация кода
3. Возврат JWT токена

### Guards

- `JwtAuthGuard` — проверка токена
- `TypeGuard` + `@UserType('customer')` — проверка типа пользователя
- `RolesGuard` + `@Roles('admin')` — проверка роли
- `@GetUser()` — извлечение пользователя из JWT

---

## 7. Events

Система использует `@nestjs/event-emitter` для слабосвязанных коммуникаций.

**Примеры событий:**
- `customer.created` — регистрация клиента
- `order.created` — создание заказа → уведомление продавцу, лог
- `shift.opened/closed` — смены
- `payment.completed` — оплата
- `log.created` — аудит

**Преимущества:** слабая связанность, легко добавлять функциональность, асинхронная обработка.

---

## 8. Data Flow

### Типичный HTTP Request

```
1. HTTP Request
   ↓
2. Controller — валидация DTO, извлечение user из JWT
   ↓
3. RoleService — DTO → Command, авторизация
   ↓
4. Domain Service (через Port) — бизнес-логика, БД
   ↓
5. Infrastructure (при необходимости)
   ↓
6. Events (опционально)
   ↓
7. Response DTO — plainToInstance с @Expose()
   ↓
8. HTTP Response
```

### Пример: Создание заказа

```
POST /customer/orders { shopId, items, deliveryAddress }

1. CustomerOrdersController.createOrder()
   - Валидация CreateOrderDto
   - Извлечение authedCustomer из JWT

2. CustomerOrdersRoleService.createOrder()
   - Проверка прав
   - DTO → CreateOrderCommand

3. OrderService.createOrder() [через OrderPort]
   - Проверка customer, shop, товаров
   - Расчет стоимости
   - Создание Order
   - Сохранение в БД

4. Events:
   - order.created → LogsService
   - order.created → NotificationService
   - order.created → ShopAccountService (холд средств)

5. Return: OrderResponseDto
```

---

## 9. Финансовая система

### Структура

```
modules/finance/
├── shop-account/       # Счета магазинов + Settlement Periods
├── seller-account/     # Счета продавцов + Withdrawals
├── platform-account/   # Счет платформы
├── order-payment/      # Платежи за заказы
├── penalty/            # Штрафы
└── refund/             # Возвраты
```

### Концепции

**Shop Account** — счет магазина с расчетными периодами (обычно неделя). Холд средств до доставки, автоматические комиссии платформе.

**Seller Account** — агрегирует средства со всех магазинов продавца. Withdrawal requests для вывода.

**Platform Account** — комиссии, штрафы, расходы на возвраты.

**Settlement Period** — период холдирования средств перед выплатой (защита от мошенничества, время на возвраты).

### Flow платежа

```
1. Клиент создает заказ → OrderPayment (PENDING)
2. Оплата через провайдер → OrderPayment (COMPLETED)
3. Средства холдятся в ShopAccount (settlement period)
4. После доставки: комиссия → PlatformAccount, остаток в ShopAccount
5. Конец периода: ShopAccount → SellerAccount, period (RELEASED)
6. Продавец запрашивает вывод → WithdrawalRequest → одобрение → выплата
```

---

> Для практических примеров кода см. [tech-guidelines.md](./tech-guidelines.md).
