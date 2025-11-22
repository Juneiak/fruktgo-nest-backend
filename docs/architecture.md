# FruktGo Backend Architecture

> **Версия:** 1.0  
> **Последнее обновление:** Ноябрь 2024

## Содержание

- [1. Обзор архитектуры](#1-обзор-архитектуры)
- [2. Архитектурные принципы](#2-архитектурные-принципы)
- [3. Структура слоев](#3-структура-слоев)
- [4. Domain Modules](#4-domain-modules)
- [5. Infrastructure Layer](#5-infrastructure-layer)
- [6. Interface Layer](#6-interface-layer)
- [7. Authentication & Authorization](#7-authentication--authorization)
- [8. Event-Driven Architecture](#8-event-driven-architecture)
- [9. Data Flow](#9-data-flow)
- [10. Финансовая система](#10-финансовая-система)
- [11. Ключевые архитектурные решения](#11-ключевые-архитектурные-решения)

---

## 1. Обзор архитектуры

FruktGo - это multi-tenant платформа для управления сетью продуктовых магазинов, построенная на NestJS с использованием **Port-Based Architecture** (Hexagonal Architecture) и **CQRS** паттерна.

### Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERFACE LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  HTTP API    │  │  WebSockets  │  │ Telegram Bots│      │
│  │  (по ролям)  │  │  (по ролям)  │  │  (по ролям)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  RoleServices (Orchestration)                        │   │
│  │  - Координация вызовов к доменным модулям            │   │
│  │  - Трансформация DTOs ↔ Commands/Queries           │   │
│  │  - Обработка ошибок                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Customer  │  │   Seller   │  │    Shop    │ ...        │
│  │   Module   │  │   Module   │  │   Module   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                               │
│  Каждый модуль содержит:                                     │
│  - Port (интерфейс)                                          │
│  - Service (бизнес-логика)                                   │
│  - Schema (данные)                                           │
│  - Commands/Queries (CQRS)                                   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Images   │  │  Addresses │  │    Logs    │ ...        │
│  │  (Storage) │  │ (Geo data) │  │(Audit log) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         DATABASE                             │
│                      MongoDB + Mongoose                      │
└─────────────────────────────────────────────────────────────┘
```

### Основные роли в системе

Система поддерживает 5 типов пользователей:

1. **Customer** - клиенты платформы (заказывают товары)
2. **Seller** - продавцы (владельцы магазинов)
3. **Shop** - магазины (точки продаж с сотрудниками)
4. **Employee** - сотрудники магазинов (работают в сменах)
5. **Admin** - администраторы платформы

Каждая роль имеет:
- Свой HTTP API endpoint (`/customer/*`, `/seller/*`, `/shop/*`, `/employee/*`, `/admin/*`)
- Свой WebSocket gateway для real-time обновлений
- Своего Telegram бота для взаимодействия

---

## 2. Архитектурные принципы

### 2.1 Port-Based Architecture (Hexagonal)

**Суть:** Бизнес-логика изолирована через интерфейсы (Ports), что делает её независимой от деталей реализации.

```typescript
// Port - контракт модуля
export interface CustomerPort {
  getCustomer(query: GetCustomerQuery): Promise<Customer | null>;
  createCustomer(command: CreateCustomerCommand): Promise<Customer>;
}

// Service реализует Port
@Injectable()
export class CustomerService implements CustomerPort {
  // Implementation
}

// Зависимости через Port, не через конкретный сервис
constructor(@Inject(CUSTOMER_PORT) private customerPort: CustomerPort) {}
```

**Преимущества:**
- Тестируемость (легко мокировать через интерфейсы)
- Независимость от фреймворка
- Замена реализации без изменения клиентов

### 2.2 CQRS (Command Query Responsibility Segregation)

**Суть:** Разделение операций чтения (Queries) и записи (Commands).

```typescript
// QUERIES - чтение данных
class GetCustomerQuery {
  constructor(
    public readonly filter: { customerId: string },
    public readonly options?: { select?: (keyof Customer)[] }
  ) {}
}

// COMMANDS - изменение данных
class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: { customerName?: string }
  ) {}
}
```

**Преимущества:**
- Явное разделение намерений
- Оптимизация read/write операций по отдельности
- Упрощение валидации и авторизации

### 2.3 Domain-Driven Design Elements

- **Aggregates:** Customer, Seller, Shop, Order, Shift - основные доменные сущности
- **Value Objects:** Address, Blocked status, Statistics
- **Domain Events:** Логируются через EventEmitter2
- **Domain Errors:** `DomainError` с кодами ошибок

### 2.4 Dependency Injection

Все зависимости управляются через NestJS DI контейнер:
- Ports регистрируются как Symbol tokens
- Services предоставляются через `useExisting`
- Глобальные модули (`@Global()`) для общих сервисов

---

## 3. Структура слоев

```
src/
├── modules/          # Доменные модули (бизнес-логика)
├── infra/            # Инфраструктурные модули (переиспользуемые)
├── interface/        # Интерфейсные слои (HTTP, WS, Telegram)
├── processes/        # Бизнес-процессы (оркестраторы)
├── common/           # Общий код (guards, decorators, utils)
└── main.ts           # Точка входа
```

### Зависимости между слоями

```
interface → processes → modules → infra → database
    ↓                      ↓
  common ←────────────────┘
```

**Правила:**
- ✅ Interface может зависеть от modules/processes
- ✅ Modules могут зависеть от infra и других modules (через Ports)
- ✅ Infra независим от modules
- ❌ Modules НЕ должны зависеть от interface
- ❌ Нет циклических зависимостей

---

## 4. Domain Modules

Доменные модули содержат основную бизнес-логику системы.

### Список модулей

| Модуль | Описание | Ключевые операции |
|--------|----------|-------------------|
| **customer** | Управление клиентами | Регистрация, профиль, адреса, корзина |
| **seller** | Управление продавцами | Регистрация, компании, верификация |
| **shop** | Управление магазинами | CRUD магазинов, связь с продавцами |
| **product** | Управление товарами | Создание, редактирование, учет остатков |
| **shop-product** | Товары в магазинах | Связь товаров с магазинами, цены |
| **employee** | Управление сотрудниками | Регистрация, прикрепление к магазинам |
| **order** | Управление заказами | Создание, статусы, доставка |
| **shift** | Управление сменами | Открытие/закрытие смен, учет работы |
| **issue** | Система обращений | Создание, обработка, ответы |
| **article** | Блог/статьи | CMS для контента платформы |
| **platform** | Платформенные настройки | Конфигурация системы |
| **finance** | Финансовая система | Счета, транзакции, выплаты |
| **job-application** | Заявки на работу | Соискатели на вакансии |

### Структура модуля (стандарт)

```
customer/
├── customer.schema.ts       # MongoDB схема + виртуальные поля
├── customer.service.ts      # Реализация бизнес-логики (implements Port)
├── customer.port.ts         # Интерфейс + DI Symbol
├── customer.commands.ts     # Command классы (write операции)
├── customer.queries.ts      # Query классы (read операции)
├── customer.enums.ts        # Енумы модуля
├── customer.module.ts       # NestJS модуль
└── index.ts                 # Экспорты с namespace группировкой
```

### Взаимодействие модулей

Модули взаимодействуют **только через Ports**:

```typescript
// ❌ НЕПРАВИЛЬНО - прямая зависимость от сервиса
constructor(private customerService: CustomerService) {}

// ✅ ПРАВИЛЬНО - через Port
constructor(@Inject(CUSTOMER_PORT) private customerPort: CustomerPort) {}
```

**Примеры зависимостей:**
- `order` → `customer`, `shop`, `product`, `shop-product`
- `shift` → `employee`, `shop`
- `customer` → `addresses` (infra)
- `seller` → `images` (infra)

---

## 5. Infrastructure Layer

Инфраструктурные модули предоставляют переиспользуемые сервисы.

### Модули инфраструктуры

| Модуль | Описание | Используется |
|--------|----------|--------------|
| **auth** | JWT аутентификация, Guards, Strategies | Глобально (`@Global()`) |
| **images** | Управление изображениями, поддержка нескольких storage providers | seller, product, shop-product |
| **addresses** | Управление адресами с геоданными | customer, shop |
| **logs** | Аудит-логирование действий пользователей | Все модули |
| **notifications** | Push, Email, SMS уведомления | order, shift, issue |

### Особенности

1. **Независимость:** Infra модули не зависят от domain модулей
2. **Переиспользование:** Один infra модуль используется многими domain модулями
3. **Структура:** Такая же как у domain модулей (Port + Service + Commands/Queries)

### Пример: Images Module

Поддерживает несколько провайдеров хранилищ:

```typescript
export enum ImageStorageProvider {
  LOCAL = 'local',
  MINIO = 'minio',
  AWS_S3 = 'aws-s3',
  CLOUDFLARE_R2 = 'cloudflare-r2',
  BACKBLAZE_B2 = 'backblaze-b2',
  WASABI = 'wasabi'
}
```

Работает с разными размерами изображений (thumbnails, original, etc.) и автоматически генерирует preview версии.

---

## 6. Interface Layer

Интерфейсный слой - точка входа для внешних взаимодействий.

### 6.1 HTTP API Layer

**Организация:** По ролям пользователей

```
interface/http/
├── admin/          # /admin/* endpoints
├── seller/         # /seller/* endpoints
├── customer/       # /customer/* endpoints
├── employee/       # /employee/* endpoints
├── shop/           # /shop/* endpoints
├── public/         # /public/* endpoints (без авторизации)
├── common/         # Общие DTOs
└── http.api.module.ts
```

**Маршрутизация:**

```typescript
RouterModule.register([
  { path: 'admin', module: AdminApiModule },
  { path: 'seller', module: SellerApiModule },
  { path: 'customer', module: CustomerApiModule },
  { path: 'employee', module: EmployeeApiModule },
  { path: 'shop', module: ShopApiModule },
  { path: 'public', module: PublicApiModule },
])
```

**Структура endpoint группы:**

```
admin/customers/
├── admin.customers.controller.ts      # NestJS контроллер
├── admin.customers.request.dtos.ts    # Request DTOs (validation)
├── admin.customers.response.dtos.ts   # Response DTOs (serialization)
├── admin.customers.role.service.ts    # Оркестрация для роли admin
└── admin.customers.api.module.ts      # Модуль
```

**Ответственность RoleService:**

```typescript
@Injectable()
export class AdminCustomersRoleService {
  constructor(
    @Inject(CUSTOMER_PORT) private customerPort: CustomerPort,
    private eventEmitter: EventEmitter2
  ) {}

  async updateCustomer(dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    try {
      // 1. Преобразование DTO → Command
      const command = new CustomerCommands.UpdateCustomerCommand(/*...*/);
      
      // 2. Вызов domain port
      await this.customerPort.updateCustomer(command);
      
      // 3. Инициация событий
      this.eventEmitter.emit('customer.updated', /*...*/);
      
      // 4. Возврат response DTO
      return this.getCustomer(customerId);
    } catch (error) {
      // 5. Обработка ошибок
      handleServiceError(error, {/*...*/});
    }
  }
}
```

### 6.2 WebSocket Layer

**Real-time обновления для каждой роли:**

```
interface/ws/
├── admin/auth/          # AdminAuthGateway
├── seller/auth/         # SellerAuthGateway
├── customer/auth/       # CustomerAuthGateway
├── employee/auth/       # EmployeeAuthGateway
├── shop/auth/           # ShopAuthGateway
└── ws.module.ts
```

**Использование:**
- Уведомления о новых заказах
- Обновления статусов в реальном времени
- Системные сообщения

### 6.3 Telegram Bots

**Отдельный бот для каждой роли:**

```
modules/telegram/
├── customer-bot/   # Бот для клиентов (заказы, статусы)
├── seller-bot/     # Бот для продавцов (управление)
├── employee-bot/   # Бот для сотрудников (работа в сменах)
├── admin-bot/      # Бот для админов (мониторинг)
└── telegram-utils.ts
```

**Интеграция:** Через библиотеку Telegraf с NestJS

---

## 7. Authentication & Authorization

### 7.1 Аутентификация

**Схема:** JWT токены с 7-дневным сроком действия

```typescript
// JWT Payload
interface JwtPayload {
  id: string;           // User ID
  type: UserType;       // 'customer' | 'seller' | 'employee' | 'admin'
  iat: number;          // Issued at
  exp: number;          // Expires at
}
```

**Процесс аутентификации:**

1. **Отправка кода:** `POST /customer/auth/send-code` с телефоном
2. **Создание LoginCode:** Генерируется 4-значный код, хранится в БД (TTL 5 минут)
3. **Верификация:** `POST /customer/auth/verify-code` с кодом
4. **Выдача токена:** Возвращается JWT токен

**Модули аутентификации:**

```
modules/auth/
├── customer-auth/      # Аутентификация клиентов
├── seller-auth/        # Аутентификация продавцов
├── employee-auth/      # Аутентификация сотрудников
├── admin-auth/         # Аутентификация админов
└── login-code.schema.ts # Общая схема кодов
```

### 7.2 Авторизация

**Guards:**

```typescript
// JWT проверка
@UseGuards(JwtAuthGuard)

// Проверка типа пользователя
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')

// Проверка роли
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'support')

// Специфичная логика (например, для employee)
@UseGuards(EmployeeAuthGuard)
```

**Декоратор для получения пользователя:**

```typescript
@Get('profile')
getProfile(@GetUser() user: AuthenticatedUser) {
  // user содержит { id, type }
}
```

**Глобальный Auth Module:**

```typescript
@Global()  // Доступен везде без import
@Module({
  providers: [JwtStrategy, JwtAuthGuard, TypeGuard],
  exports: [JwtAuthGuard, TypeGuard, JwtModule]
})
export class AuthModule {}
```

---

## 8. Event-Driven Architecture

Система использует `@nestjs/event-emitter` для слабосвязанных коммуникаций между модулями.

### Паттерн использования

```typescript
// Emit события
this.eventEmitter.emit(
  LogsEvents.LOG_EVENTS.CREATED,
  new LogsCommands.CreateLogCommand({
    entityType: LogsEnums.LogEntityType.ORDER,
    entityId: orderId,
    text: 'Заказ создан',
    logLevel: LogsEnums.LogLevel.HIGH,
    forRoles: [UserType.ADMIN, UserType.SELLER]
  })
);

// Subscribe на события
@OnEvent(LogsEvents.LOG_EVENTS.CREATED)
async handleLogCreated(command: CreateLogCommand) {
  await this.logsPort.createLog(command);
}
```

### Примеры событий

- `customer.created` - новый клиент зарегистрирован
- `order.created` - создан заказ
- `shift.opened` - открыта смена
- `shift.closed` - закрыта смена
- `payment.completed` - завершена оплата
- `log.created` - создан лог (для аудита)

**Преимущества:**
- Слабая связанность модулей
- Легко добавлять новую функциональность без изменения существующего кода
- Асинхронная обработка побочных эффектов

---

## 9. Data Flow

### Типичный HTTP Request Flow

```
1. HTTP Request (Client)
        ↓
2. Controller
   - Валидация DTO (class-validator)
   - Извлечение AuthenticatedUser из JWT
        ↓
3. RoleService
   - Трансформация DTO → Command/Query
   - Авторизационные проверки
        ↓
4. Domain Service (через Port)
   - Бизнес-логика
   - Валидация бизнес-правил
   - Работа с БД
        ↓
5. Infrastructure Services (при необходимости)
   - Images, Addresses, Logs, etc.
        ↓
6. Database (MongoDB)
   - Сохранение/чтение данных
        ↓
7. Event Emission (опционально)
   - Асинхронные побочные эффекты
        ↓
8. Response DTO
   - Трансформация через plainToInstance
   - Serialization с @Expose()
        ↓
9. HTTP Response (Client)
```

### Пример: Создание заказа

```
POST /customer/orders
Body: { shopId, items: [...], deliveryAddress }

1. CustomerOrdersController.createOrder()
   - @Body() CreateOrderDto (валидация)
   - @GetUser() authedCustomer (из JWT)

2. CustomerOrdersRoleService.createOrder()
   - Проверка: customerId === authedCustomer.id
   - Трансформация: DTO → CreateOrderCommand

3. OrderService.createOrder() [через OrderPort]
   - Проверка существования customer
   - Проверка существования shop
   - Проверка availability товаров в shopProducts
   - Расчет стоимости (items, delivery, bonuses)
   - Создание Order entity
   - Сохранение в БД через session

4. Events:
   - 'order.created' → LogsService создает лог
   - 'order.created' → NotificationService уведомляет продавца
   - 'order.created' → ShopAccountService резервирует средства

5. Return: OrderResponseDto
   - Трансформация через plainToInstance
   - Только @Expose() поля
```

---

## 10. Финансовая система

Финансовая система - один из самых сложных модулей, отвечает за денежные потоки платформы.

### Структура

```
modules/finance/
├── shop-account/           # Счета магазинов
│   ├── schemas/
│   │   ├── shop-account.schema.ts
│   │   ├── settlement-period.schema.ts
│   │   └── settlement-period-transaction.schema.ts
│   └── shop-account.service.ts
├── seller-account/         # Счета продавцов
│   ├── schemas/
│   │   ├── seller-account.schema.ts
│   │   └── withdrawal-request.schema.ts
│   └── seller-account.service.ts
├── platform-account/       # Счет платформы
│   ├── schemas/
│   │   ├── platform-account.schema.ts
│   │   └── platform-account-transaction.schema.ts
│   └── platform-account.service.ts
├── order-payment/          # Платежи за заказы
├── penalty/                # Штрафы
├── refund/                 # Возвраты
└── finance.module.ts
```

### Основные концепции

**1. Shop Account (Счет магазина)**
- Каждый магазин имеет свой счет
- **Settlement Periods** (расчетные периоды) - обычно 1 неделя
- Холд средств до доставки заказа
- Автоматические отчисления платформе (комиссия)

**2. Seller Account (Счет продавца)**
- Агрегирует средства со всех магазинов продавца
- **Withdrawal Requests** - запросы на вывод средств
- История транзакций
- Минимальная сумма для вывода

**3. Platform Account (Счет платформы)**
- Комиссии с каждого заказа
- Штрафы от магазинов
- Расходы на возвраты клиентам

**4. Типы транзакций**

```typescript
enum TransactionType {
  CREDIT = 'credit',   // Поступление (увеличение баланса)
  DEBIT = 'debit'      // Списание (уменьшение баланса)
}
```

### Flow платежа

```
1. Клиент создает заказ
   ↓
2. OrderPayment создается (status: PENDING)
   ↓
3. Клиент оплачивает через внешний платежный провайдер
   ↓
4. OrderPayment.status = COMPLETED
   ↓
5. Средства холдятся в ShopAccount (в текущем settlement period)
   ↓
6. После доставки заказа:
   - Платформа берет комиссию (X%) → PlatformAccount
   - Остаток (100% - X%) остается в ShopAccount
   ↓
7. Конец расчетного периода:
   - Средства переводятся из ShopAccount в SellerAccount
   - SettlementPeriod закрывается (status: RELEASED)
   ↓
8. Продавец запрашивает вывод:
   - Создается WithdrawalRequest
   - После одобрения админом средства выводятся
   - WithdrawalRequest.status = APPROVED
```

### Settlement Period

Расчетный период - это временной интервал, в который холдятся средства перед выплатой продавцу.

**Зачем нужен:**
- Защита от мошенничества
- Время на возвраты и жалобы
- Удержание штрафов

**Жизненный цикл:**

```typescript
enum SettlementPeriodStatus {
  ACTIVE = 'active',        // Текущий период
  FROZEN = 'frozen',        // Замороженный (расследования)
  RELEASED = 'released'     // Средства переведены продавцу
}
```

---

## 11. Ключевые архитектурные решения

### 11.1 Почему Port-Based Architecture?

**Проблема:** Tight coupling между модулями затрудняет тестирование и изменения.

**Решение:** Ports изолируют бизнес-логику от деталей реализации.

**Преимущества:**
- ✅ Легко писать unit тесты (mock через интерфейсы)
- ✅ Можно менять реализацию без изменения клиентов
- ✅ Четкие границы между модулями
- ✅ Подготовка к микросервисам (в будущем)

### 11.2 Почему CQRS?

**Проблема:** Сложная логика валидации и разные требования к чтению/записи.

**Решение:** Разделение на Commands (write) и Queries (read).

**Преимущества:**
- ✅ Явные намерения (что делает операция)
- ✅ Разная оптимизация для read/write
- ✅ Упрощенная валидация (Command валидируется, Query - нет)
- ✅ Подготовка к Event Sourcing (в будущем)

### 11.3 Почему Commands/Queries как классы?

**Альтернатива:** Использовать обычные объекты или DTOs

**Решение:** Классы с readonly полями

**Преимущества:**
- ✅ Type safety
- ✅ Явная структура данных
- ✅ Легко валидировать в конструкторе
- ✅ IDE autocompletion
- ✅ Легко рефакторить (найти все использования)

### 11.4 Почему RoleService слой?

**Проблема:** Контроллеры становятся толстыми, смешивается HTTP логика с оркестрацией.

**Решение:** Отдельный RoleService для каждой роли.

**Преимущества:**
- ✅ Контроллер остается тонким (только routing)
- ✅ Переиспользование логики между HTTP/WS/Telegram
- ✅ Четкая ответственность за авторизацию на уровне роли
- ✅ Легко тестировать оркестрацию отдельно

### 11.5 Почему MongoDB?

**Требования:**
- Гибкая схема для быстрой разработки
- Хорошая производительность для read-heavy операций
- Embedded documents для денормализации
- Native JSON для API responses

**Компромиссы:**
- ❌ Нет ACID транзакций между коллекциями (но есть sessions)
- ❌ Сложнее делать сложные joins (но есть $lookup)
- ✅ Быстрый старт и итерация
- ✅ Хорошая масштабируемость (sharding)
- ✅ Гибкость схемы для MVP

### 11.6 Namespace группировка экспортов

**Проблема:** `import * as X from 'module'` загрязняет namespace

**Решение:** Явная группировка через `export * as`

```typescript
// index.ts
export { CustomerModule } from './customer.module';
export { Customer } from './customer.schema';
export { CustomerPort, CUSTOMER_PORT } from './customer.port';
export * as CustomerCommands from './customer.commands';
export * as CustomerQueries from './customer.queries';

// Usage
import { CustomerCommands, CustomerQueries } from 'src/modules/customer';
const cmd = new CustomerCommands.CreateCustomerCommand({...});
```

**Преимущества:**
- ✅ Чистые импорты без wildcard
- ✅ Группировка связанных классов
- ✅ Избежание конфликтов имен
- ✅ Понятно откуда что импортируется

### 11.7 Виртуальные ID поля (*Id)

**Проблема:** MongoDB использует `_id`, но в API хотим `customerId`, `orderId`, etc.

**Решение:** Виртуальные поля с суффиксом Id

```typescript
@Schema({ id: false }) // Отключаем дефолтное virtual 'id'
export class Customer {
  readonly customerId: string; // Виртуальное поле
  _id: Types.ObjectId;
}

// Virtual field
CustomerSchema.virtual('customerId').get(function() {
  return this._id.toString();
});
```

**Преимущества:**
- ✅ Единообразие именования в API
- ✅ Понятно какой сущности принадлежит ID
- ✅ `_id` остается для внутреннего использования
- ✅ Плагин `mongooseLeanVirtuals` делает это работать с `.lean()`

---

## Заключение

Эта архитектура разработана с учетом:

1. **Масштабируемости** - легко добавлять новые модули и функции
2. **Тестируемости** - четкие границы через Ports
3. **Поддерживаемости** - единообразная структура модулей
4. **Гибкости** - CQRS и события позволяют эволюционировать систему
5. **Производительности** - денормализация данных для быстрых чтений

Для глубокого понимания паттернов реализации см. [tech-guidelines.md](../tech-guidelines.md).

Для понимания бизнес-логики см. [docs/business/](../business/).

---

> **Примечание:** Документ обновляется по мере эволюции системы. При внесении архитектурных изменений обязательно обновляйте этот файл.

