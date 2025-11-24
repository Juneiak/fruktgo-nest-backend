# Customer Module

> **Модуль:** `src/modules/customer`  
> **Назначение:** Управление клиентами платформы, их профилями, адресами и корзинами

---

## Содержание

- [1. Обзор](#1-обзор)
- [2. Схемы данных](#2-схемы-данных)
- [3. Енумы](#3-енумы)
- [4. Commands (Write операции)](#4-commands-write-операции)
- [5. Queries (Read операции)](#5-queries-read-операции)
- [6. Port (Интерфейс)](#6-port-интерфейс)
- [7. Service (Бизнес-логика)](#7-service-бизнес-логика)
- [8. Связи с другими модулями](#8-связи-с-другими-модулями)
- [9. API Endpoints](#9-api-endpoints)

---

## 1. Обзор

**Модуль Customer** - центральный модуль для работы с клиентами платформы. Управляет профилями, аутентификацией через Telegram, адресами доставки и корзинами покупок.

### Основные возможности

- ✅ Регистрация клиентов через Telegram
- ✅ Управление профилем (имя, пол, дата рождения, email)
- ✅ Управление адресами доставки
- ✅ Выбор активного адреса
- ✅ Блокировка/разблокировка клиентов
- ✅ Верификация клиентов
- ✅ Статистика (количество заказов, общая сумма)
- ✅ Интеграция с корзиной
- ✅ Отслеживание активных заказов
- ✅ Внутренние заметки админов

### Бизнес-контекст

Customer - это клиент платформы, который:
- Регистрируется через Telegram бота
- Может иметь несколько адресов доставки
- Имеет одну корзину для заказов
- Может быть заблокирован платформой за нарушения
- Проходит верификацию (опционально)
- Накапливает статистику заказов

---

## 2. Схемы данных

### Customer Schema

**Файл:** `customer.schema.ts`

```typescript
class Customer {
  _id: Types.ObjectId;
  customerId: string;              // Виртуальное поле (_id.toString())
  
  // Telegram данные (основная аутентификация)
  telegramId: number;              // Уникальный ID в Telegram (required, unique)
  telegramUsername?: string;       // @username в Telegram
  telegramFirstName?: string;      // Имя из Telegram
  telegramLastName?: string;       // Фамилия из Telegram
  
  // Контакты
  phone?: string;                  // Телефон (unique, sparse)
  email?: string;                  // Email (unique, sparse)
  
  // Профиль
  customerName: string;            // Имя клиента (required)
  sex?: UserSex;                   // Пол (default: NOT_SPECIFIED)
  birthDate?: Date;                // Дата рождения
  
  // Статусы
  blocked: Blocked;                // Информация о блокировке
  verifiedStatus: VerifiedStatus;  // Статус верификации (default: IS_CHECKING)
  
  // Активность
  lastLoginAt?: Date | null;       // Последний вход
  lastOrderAt?: Date | null;       // Последний заказ
  
  // Статистика
  statistics: CustomerStatistics;  // Счётчики заказов и трат
  
  // Связи
  addresses: Types.ObjectId[];     // Массив адресов доставки
  selectedAddress: Types.ObjectId | null; // Выбранный адрес
  cart: Types.ObjectId | null;     // Корзина клиента
  activeOrders: Types.ObjectId[];  // Активные заказы
  
  // Для админов
  internalNote?: string;           // Внутренняя заметка
  
  // Метаданные
  createdAt: Date;                 // Дата регистрации
  updatedAt: Date;                 // Дата обновления
}
```

### CustomerStatistics

```typescript
interface CustomerStatistics {
  ordersCount: number;   // Количество заказов (default: 0)
  totalSpent: number;    // Общая сумма потраченная (default: 0)
}
```

### Индексы

Автоматические уникальные индексы:
- `telegramId` - unique (основной идентификатор)
- `phone` - unique, sparse (может быть null)
- `email` - unique, sparse (может быть null)

### Плагины

- **mongooseLeanVirtuals** - виртуальные поля в `.lean()` запросах
- **mongoosePaginate** - пагинация списков

### Виртуальные поля

```typescript
customerId: string  // = _id.toString()
```

---

## 2.2. Cart Schema

**Файл:** `cart.schema.ts`

Корзина клиента для формирования заказа.

```typescript
class Cart {
  _id: Types.ObjectId;
  cartId: string;                  // Виртуальное поле
  
  customer: Types.ObjectId | null; // Ссылка на Customer
  
  products: CartProduct[];         // Товары в корзине
  totalSum: number;                // Общая сумма (default: 0)
  
  selectedShopId: Types.ObjectId | null; // Выбранный магазин
  isReadyToOrder: boolean;         // Готова ли корзина к оформлению (default: false)
  
  deliveryInfo: DeliveryInfo;      // Информация о доставке
}
```

### CartProduct

```typescript
interface CartProduct {
  shopProduct: Types.ObjectId;     // Ссылка на ShopProduct
  selectedQuantity: number;        // Выбранное количество
}
```

### DeliveryInfo

```typescript
interface DeliveryInfo {
  to?: string;                     // Адрес доставки
  from?: string;                   // Адрес отправления
  estimatedDeliveryDate?: Date;    // Предполагаемая дата
  actualDeliveryDate?: Date;       // Фактическая дата
  price?: number;                  // Стоимость доставки
}
```

---

## 3. Енумы

### BlockStatus

Статус блокировки пользователя (общий enum из `common.enum.ts`).

```typescript
enum BlockStatus {
  ACTIVE = 'active',        // Нет ограничений
  BLOCKED = 'blocked',      // Блокировка без срока
  SUSPENDED = 'suspended'   // Временная приостановка до blockedUntil
}
```

---

### VerifiedStatus

Статус верификации клиента.

```typescript
enum VerifiedStatus {
  VERIFIED = 'verified',           // Верифицирован
  NOT_VERIFIED = 'notVerified',    // Не верифицирован
  IS_CHECKING = 'isChecking'       // На проверке (default)
}
```

**Использование:**
- `IS_CHECKING` - новый клиент, проверка не проведена
- `VERIFIED` - клиент прошёл верификацию (подтвердил телефон/документы)
- `NOT_VERIFIED` - клиент не прошёл верификацию

---

### UserSex

Пол пользователя.

```typescript
enum UserSex {
  MALE = 'male',                   // Мужской
  FEMALE = 'female',               // Женский
  NOT_SPECIFIED = 'notSpecified'   // Не указан (default)
}
```

---

### Blocked Schema

Структура информации о блокировке.

```typescript
interface Blocked {
  status: BlockStatus;      // Статус блокировки
  reason?: string;          // Причина блокировки
  code?: string;            // Код нарушения
  by?: Types.ObjectId;      // Кто заблокировал (Platform)
  blockedAt?: Date;         // Когда заблокирован
  blockedUntil?: Date;      // До какой даты (для SUSPENDED)
}
```

---

## 4. Commands (Write операции)

### CreateCustomerCommand

Создание нового клиента (регистрация через Telegram).

```typescript
class CreateCustomerCommand {
  constructor(
    public readonly payload: {
      telegramId: number;             // Telegram ID (required)
      customerName: string;           // Имя клиента (required)
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
      phone?: string;
      email?: string;
    }
  )
}
```

**Бизнес-логика:**
- Проверяет уникальность `telegramId`
- Устанавливает `verifiedStatus = IS_CHECKING` по умолчанию
- Инициализирует `blocked.status = ACTIVE`
- Инициализирует `statistics = { ordersCount: 0, totalSpent: 0 }`
- Создаёт пустую корзину и привязывает к клиенту

**Исключения:**
- `CONFLICT` - если клиент с таким `telegramId` уже существует

---

### UpdateCustomerCommand

Обновление профиля клиента.

```typescript
class UpdateCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      verifiedStatus?: VerifiedStatus;
      internalNote?: string | null;
      customerName?: string | null;
      sex?: UserSex;
      birthDate?: Date | null;
      email?: string | null;
    }
  )
}
```

**Бизнес-логика:**
- Обновляются только переданные поля
- `null` = очистить поле
- `undefined` = не трогать поле

---

### BlockCustomerCommand

Блокировка или разблокировка клиента.

```typescript
class BlockCustomerCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: BlockPayload // { status, reason?, code?, blockedUntil? }
  )
}
```

**Бизнес-логика:**
- Устанавливает статус блокировки
- При блокировке заполняет: `reason`, `code`, `by`, `blockedAt`
- При `SUSPENDED` требуется `blockedUntil`
- При разблокировке (`ACTIVE`) очищает все поля кроме `status`

---

### AddAddressCommand

Добавление нового адреса доставки.

```typescript
class AddAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      latitude: number;
      longitude: number;
      city: string;
      street: string;
      house: string;
      apartment?: string | null;
      floor?: string | null;
      entrance?: string | null;
      intercomCode?: string | null;
    }
  )
}
```

**Бизнес-логика:**
- Создаёт адрес через `AddressesPort.createAddress()`
- Добавляет ID адреса в массив `customer.addresses`
- Если это первый адрес, устанавливает его как `selectedAddress`

---

### DeleteAddressCommand

Удаление адреса доставки.

```typescript
class DeleteAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      addressId: string;
    }
  )
}
```

**Бизнес-логика:**
- Удаляет адрес через `AddressesPort.deleteAddress()`
- Удаляет ID из массива `customer.addresses`
- Если удаляемый адрес был `selectedAddress`, сбрасывает на `null`

---

### SelectAddressCommand

Выбор активного адреса доставки.

```typescript
class SelectAddressCommand {
  constructor(
    public readonly customerId: string,
    public readonly payload: {
      addressId: string;
    }
  )
}
```

**Бизнес-логика:**
- Проверяет, что адрес принадлежит клиенту
- Устанавливает `customer.selectedAddress = addressId`

---

## 5. Queries (Read операции)

### GetCustomerQuery

Получить одного клиента по различным критериям.

```typescript
class GetCustomerQuery {
  constructor(
    public readonly filter: AtLeastOne<{
      customerId: string;
      telegramId: number;
      phone: string;
      email: string;
    }>,
    public readonly options?: {
      select?: (keyof Customer)[]  // Типобезопасный выбор полей
    }
  )
}
```

**Особенность:** Принимает **хотя бы один** из фильтров (AtLeastOne utility type).

**Использование:**
```typescript
// По customerId
new GetCustomerQuery({ customerId: '507f...' })

// По telegramId
new GetCustomerQuery({ telegramId: 123456789 })

// По телефону
new GetCustomerQuery({ phone: '+79991234567' })

// С выбором полей
new GetCustomerQuery(
  { customerId: '507f...' },
  { select: ['customerName', 'phone', 'email'] }
)
```

---

### GetCustomersQuery

Получить список клиентов с фильтрами.

```typescript
class GetCustomersQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
      sexes?: UserSex[];
      fromBirthDate?: Date;
      toBirthDate?: Date;
    },
    public readonly options?: {
      select?: (keyof Customer)[]
    }
  )
}
```

**Пагинация** передаётся через `CommonListQueryOptions`:
```typescript
{
  pagination: { page: 1, pageSize: 20 },
  sort: { createdAt: -1 } // По умолчанию новые первые
}
```

---

## 6. Port (Интерфейс)

**Файл:** `customer.port.ts`

```typescript
interface CustomerPort {
  // QUERIES
  getCustomers(
    query: GetCustomersQuery, 
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Customer>>;
  
  getCustomer(
    query: GetCustomerQuery, 
    queryOptions?: CommonCommandOptions
  ): Promise<Customer | null>;

  // COMMANDS
  createCustomer(
    command: CreateCustomerCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Customer>;
  
  updateCustomer(
    command: UpdateCustomerCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  blockCustomer(
    command: BlockCustomerCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  addAddress(
    command: AddAddressCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  deleteAddress(
    command: DeleteAddressCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  selectAddress(
    command: SelectAddressCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const CUSTOMER_PORT = Symbol('CUSTOMER_PORT');
```

### Injection

```typescript
constructor(
  @Inject(CUSTOMER_PORT) private customerPort: CustomerPort
) {}
```

---

## 7. Service (Бизнес-логика)

**Файл:** `customer.service.ts`

### Ключевые методы

#### createCustomer

1. Проверяет уникальность `telegramId`
2. Создаёт клиента с дефолтными значениями:
   - `verifiedStatus = IS_CHECKING`
   - `blocked = { status: ACTIVE }`
   - `statistics = { ordersCount: 0, totalSpent: 0 }`
3. Создаёт пустую корзину через `CartService.createCart()`
4. Привязывает корзину к клиенту
5. Возвращает созданного клиента

---

#### updateCustomer

1. Находит клиента по `customerId`
2. Обновляет только переданные поля через `assignField()`
3. Сохраняет изменения

**Важно:** `assignField()` корректно обрабатывает:
- `undefined` - не изменяет поле
- `null` - очищает поле
- `value` - устанавливает значение

---

#### blockCustomer

1. Находит клиента
2. Обновляет поле `blocked`:
   - При блокировке: заполняет `reason`, `code`, `by`, `blockedAt`
   - При `SUSPENDED`: требует `blockedUntil`
   - При `ACTIVE`: очищает все поля кроме `status`
3. Сохраняет изменения

---

#### addAddress

1. Проверяет существование клиента
2. Создаёт адрес через `AddressesPort.createAddress()`:
   - `entityType = CUSTOMER`
   - `entityId = customerId`
   - `addressType = DELIVERY`
3. Добавляет ID адреса в массив `customer.addresses`
4. **Если это первый адрес**, устанавливает `selectedAddress = addressId`
5. Сохраняет

---

#### deleteAddress

1. Проверяет, что адрес принадлежит клиенту
2. Удаляет адрес через `AddressesPort.deleteAddress()`
3. Удаляет ID из массива `customer.addresses`
4. Если удаляемый адрес был `selectedAddress`:
   - Сбрасывает `selectedAddress = null`
5. Сохраняет

---

#### selectAddress

1. Проверяет, что адрес существует в массиве `customer.addresses`
2. Устанавливает `customer.selectedAddress = addressId`
3. Сохраняет

---

## 8. Связи с другими модулями

### Infrastructure Dependencies

#### AddressesPort

**Связь:** Customer → Addresses

**Использование:**
- `createAddress()` - создание адреса доставки
- `deleteAddress()` - удаление адреса
- `getAddress()` - получение адреса

**Конфигурация:**
```typescript
{
  entityType: AddressesEnums.AddressEntityType.CUSTOMER,
  entityId: customerId,
  addressType: AddressesEnums.AddressType.DELIVERY
}
```

---

### Domain Dependencies

#### CartService (внутри модуля)

**Связь:** Customer → Cart (внутренняя)

**Использование:**
- При создании клиента автоматически создаётся корзина
- Корзина привязывается через `customer.cart = cartId`

---

### Consumers (кто использует Customer)

#### Interface Layer

- **CustomerMeRoleService** - профиль клиента (`/customer/me/*`)
- **AdminCustomersRoleService** - админ панель (`/admin/customers/*`)

#### Domain Modules

- **OrderService** - проверка клиента при создании заказа
- **IssueService** - привязка обращений к клиенту
- **Customer-AuthService** - аутентификация клиентов

---

## 9. API Endpoints

### Customer API (`/customer/me`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить профиль | GetCustomerQuery |
| PATCH | `/` | Обновить профиль | UpdateCustomerCommand |
| POST | `/address` | Добавить адрес | AddAddressCommand |
| PATCH | `/address/:addressId` | Обновить адрес | UpdateAddressCommand (Addresses) |
| DELETE | `/address/:addressId` | Удалить адрес | DeleteAddressCommand |
| PATCH | `/address/:addressId/select` | Выбрать адрес | SelectAddressCommand |

**Авторизация:** JWT токен с типом `customer`.

---

### Admin API (`/admin/customers`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить список клиентов | GetCustomersQuery |
| GET | `/:customerId` | Получить клиента | GetCustomerQuery |
| PATCH | `/:customerId` | Обновить клиента | UpdateCustomerCommand |
| PATCH | `/:customerId/block` | Заблокировать/разблокировать | BlockCustomerCommand |
| DELETE | `/:customerId` | Удалить клиента | deleteCustomer() |

**Авторизация:** JWT токен с типом `admin`.

---

## Примеры использования

### Создание клиента через Telegram

```typescript
const command = new CreateCustomerCommand({
  telegramId: 123456789,
  customerName: 'Иван',
  telegramUsername: 'ivanov',
  telegramFirstName: 'Иван',
  phone: '+79991234567'
});

const customer = await customerPort.createCustomer(command);
console.log(customer.customerId); // "507f..."
console.log(customer.cart); // ObjectId корзины
```

---

### Добавление адреса доставки

```typescript
const command = new AddAddressCommand(
  customerId,
  {
    latitude: 55.7558,
    longitude: 37.6173,
    city: 'Москва',
    street: 'Тверская',
    house: '1',
    apartment: '10',
    floor: '5',
    entrance: '2',
    intercomCode: '123'
  }
);

await customerPort.addAddress(command);
```

---

### Блокировка клиента

```typescript
const command = new BlockCustomerCommand(
  customerId,
  {
    status: BlockStatus.BLOCKED,
    reason: 'Множественные нарушения правил платформы',
    code: 'FRAUD_DETECTED'
  }
);

await customerPort.blockCustomer(command);
```

---

### Получение клиентов с фильтрами

```typescript
const query = new GetCustomersQuery({
  verifiedStatuses: [VerifiedStatus.VERIFIED],
  blockedStatuses: [BlockStatus.ACTIVE]
});

const result = await customerPort.getCustomers(query, {
  pagination: { page: 1, pageSize: 20 },
  sort: { createdAt: -1 }
});

console.log(result.docs); // Клиенты
console.log(result.totalDocs); // Всего
console.log(result.totalPages); // Страниц
```

---

## Заключение

**Customer Module** - фундаментальный модуль платформы, управляющий жизненным циклом клиентов.

**Ключевые особенности:**
- ✅ Аутентификация через Telegram (уникальный `telegramId`)
- ✅ Гибкая система адресов с выбором активного
- ✅ Интеграция с корзиной и заказами
- ✅ Система блокировок и верификации
- ✅ Статистика активности
- ✅ Типобезопасные Commands/Queries

**Связанные модули:**
- **Cart** (внутри Customer) - корзина покупок
- **Addresses** (Infrastructure) - управление адресами
- **Order** - создание заказов
- **Customer-Auth** - аутентификация

**Возможные улучшения (backlog):**
- [ ] Система лояльности (бонусы, баллы)
- [ ] Уровни верификации (базовая, полная с документами)
- [ ] История изменений профиля
- [ ] Предпочтения и интересы клиента
- [ ] Избранные товары
- [ ] Подписки на магазины/категории
- [ ] Рефералы и приглашения

---

> **Примечание:** При изменении схемы или портов обязательно обновлять эту документацию.

