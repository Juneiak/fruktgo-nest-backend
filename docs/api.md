# FruktGo API Documentation

> **Версия API:** 1.0  
> **Последнее обновление:** Ноябрь 2024

## Содержание

- [1. Обзор API](#1-обзор-api)
- [2. Аутентификация](#2-аутентификация)
- [3. Общие паттерны](#3-общие-паттерны)
- [4. Customer API](#4-customer-api)
- [5. Seller API](#5-seller-api)
- [6. Shop API](#6-shop-api)
- [7. Employee API](#7-employee-api)
- [8. Admin API](#8-admin-api)
- [9. Public API](#9-public-api)
- [10. Коды ошибок](#10-коды-ошибок)

---

## 1. Обзор API

FruktGo API построен на принципе **разделения по ролям**. Каждая роль пользователя имеет свой набор endpoints, изолированный от других ролей.

### Базовая структура URL

```
https://api.fruktgo.com/
├── customer/*      # API для клиентов
├── seller/*        # API для продавцов
├── shop/*          # API для магазинов (shop accounts)
├── employee/*      # API для сотрудников
├── admin/*         # API для администраторов
└── public/*        # Публичное API (без авторизации)
```

### Принципы проектирования

1. **RESTful** - используем стандартные HTTP методы (GET, POST, PATCH, DELETE)
2. **Resource-oriented** - endpoints построены вокруг ресурсов (orders, shops, products)
3. **Role-based** - строгое разделение доступа по ролям
4. **Consistent** - единообразные паттерны именования и структуры ответов

### Swagger/OpenAPI

API автоматически документируется через Swagger:
- **URL:** `https://api.fruktgo.com/api`
- **Теги:** Endpoints группируются по ролям (`for customer`, `for seller`, etc.)

---

## 2. Аутентификация

### JWT Bearer Token

Все защищенные endpoints требуют JWT токен в заголовке:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Процесс получения токена

#### Для Customer/Seller/Employee

1. **Запросить код:**
```http
GET /customer/auth/login-code
```

Response:
```json
{
  "code": "1234",
  "expiresAt": "2024-11-17T23:15:00.000Z"
}
```

2. **Верифицировать код:**
```http
POST /customer/auth/verify-code
Content-Type: application/json

{
  "phone": "+79991234567",
  "code": "1234"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "customer": {
    "customerId": "...",
    "phone": "+79991234567",
    "customerName": "Иван"
  }
}
```

#### Для Admin

Аутентификация через логин/пароль (детали в Admin API).

### JWT Payload

```typescript
{
  "id": "507f1f77bcf86cd799439011",  // User ID
  "type": "customer",                  // customer | seller | employee | admin
  "iat": 1700255400,                   // Issued at
  "exp": 1700860200                    // Expires at (7 дней)
}
```

### Guards и декораторы

```typescript
// Требует JWT токен
@UseGuards(JwtAuthGuard)

// Требует определенный тип пользователя
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')

// Получить текущего пользователя
@GetUser() authedUser: AuthenticatedUser
```

---

## 3. Общие паттерны

### Request DTOs

Используется **class-validator** для валидации:

```typescript
export class CreateOrderDto {
  @IsMongoId()
  @IsNotEmpty()
  shopId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  deliveryNote?: string;
}
```

### Response DTOs

Используется **class-transformer** для сериализации:

```typescript
export class OrderResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  @Type(() => CustomerPreviewResponseDto)
  customer: CustomerPreviewResponseDto;

  @Expose()
  totalPrice: number;

  @Expose()
  status: OrderStatus;
  
  @Expose()
  createdAt: Date;
}
```

### Pagination

Для списковых endpoints (в будущем):

```typescript
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalItems": 100
  }
}
```

### Успешные ответы

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "status": "pending",
  "totalPrice": 1500,
  "createdAt": "2024-11-17T20:00:00.000Z"
}
```

### Ошибки

```json
{
  "statusCode": 404,
  "message": "Заказ не найден",
  "error": "Not Found"
}
```

---

## 4. Customer API

**Базовый путь:** `/customer`

### 4.1 Authentication (`/customer/auth`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/login-code` | Получить код для входа | ❌ Public |
| POST | `/verify-code` | Верифицировать код и получить токен | ❌ Public |
| GET | `/me` | Проверить текущую аутентификацию | ✅ JWT |

### 4.2 Profile (`/customer/me`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить профиль клиента | ✅ JWT |
| PATCH | `/` | Обновить профиль | ✅ JWT |
| POST | `/address` | Добавить адрес доставки | ✅ JWT |
| PATCH | `/address/:addressId` | Обновить адрес | ✅ JWT |
| DELETE | `/address/:addressId` | Удалить адрес | ✅ JWT |

### 4.3 Cart (`/customer/cart`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить корзину | ✅ JWT |
| POST | `/items` | Добавить товар в корзину | ✅ JWT |
| PATCH | `/items/:shopProductId` | Изменить количество | ✅ JWT |
| DELETE | `/items/:shopProductId` | Удалить товар из корзины | ✅ JWT |
| DELETE | `/` | Очистить корзину | ✅ JWT |

### 4.4 Orders (`/customer/orders`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать заказ | ✅ JWT |
| GET | `/` | Получить все заказы | ✅ JWT |
| GET | `/active` | Получить активные заказы | ✅ JWT |
| GET | `/:orderId` | Получить детали заказа | ✅ JWT |
| DELETE | `/:orderId` | Отменить заказ | ✅ JWT |
| POST | `/:orderId/rating` | Поставить оценку заказу | ✅ JWT |

**Пример: Создание заказа**

```http
POST /customer/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shopId": "507f1f77bcf86cd799439011",
  "items": [
    {
      "shopProductId": "507f191e810c19729de860ea",
      "quantity": 2
    }
  ],
  "deliveryAddressId": "507f1f77bcf86cd799439012",
  "deliveryNote": "Позвоните за 10 минут",
  "useBonus": 50
}
```

Response:
```json
{
  "orderId": "507f1f77bcf86cd799439013",
  "orderNumber": "ORD-2024-11-0001",
  "status": "pending",
  "totalPrice": 1450,
  "createdAt": "2024-11-17T20:00:00.000Z"
}
```

### 4.5 Issues (`/customer/issues`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать обращение | ✅ JWT |
| GET | `/` | Получить мои обращения | ✅ JWT |
| GET | `/:issueId` | Получить детали обращения | ✅ JWT |

---

## 5. Seller API

**Базовый путь:** `/seller`

### 5.1 Authentication (`/seller/auth`)

Аналогично Customer Auth (login-code flow).

### 5.2 Profile (`/seller/me`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить профиль продавца | ✅ JWT |
| PATCH | `/` | Обновить профиль | ✅ JWT |
| PATCH | `/company` | Обновить информацию о компании | ✅ JWT |

### 5.3 Shops (`/seller/shops`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список магазинов | ✅ JWT |
| GET | `/:shopId` | Получить детали магазина | ✅ JWT |
| PATCH | `/:shopId` | Обновить магазин (с загрузкой изображения) | ✅ JWT |

**Примечание:** Создание магазина временно недоступно через API (требует создания ShopAccount).

### 5.4 Products (`/seller/products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать товар | ✅ JWT |
| GET | `/` | Получить список товаров | ✅ JWT |
| GET | `/:productId` | Получить детали товара | ✅ JWT |
| PATCH | `/:productId` | Обновить товар | ✅ JWT |
| DELETE | `/:productId` | Удалить товар | ✅ JWT |

### 5.5 Shop Products (`/seller/shop-products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Добавить товар в магазин | ✅ JWT |
| GET | `/shop/:shopId` | Получить товары магазина | ✅ JWT |
| GET | `/:shopProductId` | Получить детали | ✅ JWT |
| PATCH | `/:shopProductId` | Обновить (цена, остаток) | ✅ JWT |
| DELETE | `/:shopProductId` | Удалить из магазина | ✅ JWT |

### 5.6 Employees (`/seller/employees`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Нанять сотрудника | ✅ JWT |
| GET | `/` | Получить список сотрудников | ✅ JWT |
| GET | `/:employeeId` | Получить детали сотрудника | ✅ JWT |
| PATCH | `/:employeeId` | Обновить информацию (зарплата, должность) | ✅ JWT |
| PATCH | `/:employeeId/pin` | Прикрепить к магазину | ✅ JWT |
| DELETE | `/:employeeId` | Уволить сотрудника | ✅ JWT |

### 5.7 Orders (`/seller/orders`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/shop/:shopId` | Получить заказы магазина | ✅ JWT |
| GET | `/:orderId` | Получить детали заказа | ✅ JWT |
| PATCH | `/:orderId/status` | Обновить статус заказа | ✅ JWT |

### 5.8 Shifts (`/seller/shifts`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/shop/:shopId` | Получить смены магазина | ✅ JWT |
| GET | `/:shiftId` | Получить детали смены | ✅ JWT |
| POST | `/open` | Открыть смену (для сотрудника) | ✅ JWT |
| POST | `/:shiftId/close` | Закрыть смену | ✅ JWT |

### 5.9 Issues (`/seller/issues`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать обращение | ✅ JWT |
| GET | `/` | Получить мои обращения | ✅ JWT |

### 5.10 Job Applications (`/seller/job-applications`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить заявки на работу | ✅ JWT |
| GET | `/:applicationId` | Получить детали заявки | ✅ JWT |
| PATCH | `/:applicationId/approve` | Одобрить заявку | ✅ JWT |
| DELETE | `/:applicationId` | Отклонить заявку | ✅ JWT |

---

## 6. Shop API

**Базовый путь:** `/shop`

**Описание:** API для магазинов как отдельных пользователей системы (shop accounts). Позволяет магазину управлять своими заказами и сменами.

### 6.1 Authentication (`/shop/auth`)

Аналогично Customer/Seller Auth (login-code flow).

### 6.2 Profile (`/shop/me`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить информацию о магазине | ✅ JWT |
| PATCH | `/` | Обновить информацию | ✅ JWT |

### 6.3 Orders (`/shop/orders`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить заказы магазина | ✅ JWT |
| GET | `/:orderId` | Получить детали заказа | ✅ JWT |
| PATCH | `/:orderId/status` | Обновить статус заказа | ✅ JWT |

### 6.4 Shifts (`/shop/shifts`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить смены магазина | ✅ JWT |
| GET | `/:shiftId` | Получить детали смены | ✅ JWT |

### 6.5 Shop Products (`/shop/shop-products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить товары магазина | ✅ JWT |
| GET | `/:shopProductId` | Получить детали товара | ✅ JWT |
| PATCH | `/:shopProductId` | Обновить товар (остаток, цена) | ✅ JWT |

---

## 7. Employee API

**Базовый путь:** `/employee`

**Описание:** API для сотрудников магазинов. Минимальный набор функций для работы в смене.

### 7.1 Authentication (`/employee/auth`)

Аналогично Customer/Seller Auth (login-code flow).

### 7.2 Profile (`/employee/me`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить профиль сотрудника | ✅ JWT |
| PATCH | `/` | Обновить профиль | ✅ JWT |

### 7.3 Issues (`/employee/issues`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать обращение | ✅ JWT |
| GET | `/` | Получить мои обращения | ✅ JWT |

---

## 8. Admin API

**Базовый путь:** `/admin`

**Описание:** Полный доступ ко всем ресурсам платформы для управления и модерации.

### 8.1 Authentication (`/admin/auth`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/login` | Вход по логину/паролю | ❌ Public |
| GET | `/me` | Проверить аутентификацию | ✅ JWT |

### 8.2 Platform (`/admin/platform`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить настройки платформы | ✅ JWT (Admin) |
| PATCH | `/` | Обновить настройки | ✅ JWT (Admin) |

### 8.3 Customers (`/admin/customers`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список клиентов | ✅ JWT (Admin) |
| GET | `/:customerId` | Получить детали клиента | ✅ JWT (Admin) |
| PATCH | `/:customerId` | Обновить клиента | ✅ JWT (Admin) |
| PATCH | `/:customerId/block` | Заблокировать/разблокировать | ✅ JWT (Admin) |
| DELETE | `/:customerId` | Удалить клиента | ✅ JWT (Admin) |

### 8.4 Sellers (`/admin/sellers`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список продавцов | ✅ JWT (Admin) |
| GET | `/:sellerId` | Получить детали продавца | ✅ JWT (Admin) |
| PATCH | `/:sellerId` | Обновить продавца | ✅ JWT (Admin) |
| PATCH | `/:sellerId/verify` | Верифицировать продавца | ✅ JWT (Admin) |
| PATCH | `/:sellerId/block` | Заблокировать/разблокировать | ✅ JWT (Admin) |

### 8.5 Shops (`/admin/shops`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать магазин | ✅ JWT (Admin) |
| GET | `/` | Получить список магазинов | ✅ JWT (Admin) |
| GET | `/:shopId` | Получить детали магазина | ✅ JWT (Admin) |
| PATCH | `/:shopId` | Обновить магазин | ✅ JWT (Admin) |
| PATCH | `/:shopId/block` | Заблокировать/разблокировать | ✅ JWT (Admin) |
| DELETE | `/:shopId` | Удалить магазин | ✅ JWT (Admin) |

### 8.6 Products (`/admin/products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать товар | ✅ JWT (Admin) |
| GET | `/` | Получить список товаров | ✅ JWT (Admin) |
| GET | `/:productId` | Получить детали товара | ✅ JWT (Admin) |
| PATCH | `/:productId` | Обновить товар | ✅ JWT (Admin) |
| DELETE | `/:productId` | Удалить товар | ✅ JWT (Admin) |

### 8.7 Shop Products (`/admin/shop-products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Добавить товар в магазин | ✅ JWT (Admin) |
| GET | `/` | Получить список | ✅ JWT (Admin) |
| GET | `/:shopProductId` | Получить детали | ✅ JWT (Admin) |
| PATCH | `/:shopProductId` | Обновить | ✅ JWT (Admin) |
| DELETE | `/:shopProductId` | Удалить из магазина | ✅ JWT (Admin) |

### 8.8 Employees (`/admin/employees`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список сотрудников | ✅ JWT (Admin) |
| GET | `/:employeeId` | Получить детали сотрудника | ✅ JWT (Admin) |
| PATCH | `/:employeeId` | Обновить сотрудника | ✅ JWT (Admin) |

### 8.9 Orders (`/admin/orders`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать заказ (для клиента) | ✅ JWT (Admin) |
| GET | `/` | Получить список заказов | ✅ JWT (Admin) |
| GET | `/:orderId` | Получить детали заказа | ✅ JWT (Admin) |
| PATCH | `/:orderId` | Обновить заказ | ✅ JWT (Admin) |
| PATCH | `/:orderId/status` | Изменить статус | ✅ JWT (Admin) |
| DELETE | `/:orderId` | Удалить заказ | ✅ JWT (Admin) |

### 8.10 Shifts (`/admin/shifts`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список смен | ✅ JWT (Admin) |
| GET | `/:shiftId` | Получить детали смены | ✅ JWT (Admin) |
| PATCH | `/:shiftId` | Обновить смену | ✅ JWT (Admin) |
| POST | `/:shiftId/close` | Закрыть смену | ✅ JWT (Admin) |

### 8.11 Issues (`/admin/issues`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить все обращения | ✅ JWT (Admin) |
| GET | `/:issueId` | Получить детали обращения | ✅ JWT (Admin) |
| PATCH | `/:issueId` | Обновить обращение | ✅ JWT (Admin) |
| POST | `/:issueId/messages` | Ответить на обращение | ✅ JWT (Admin) |
| PATCH | `/:issueId/status` | Изменить статус | ✅ JWT (Admin) |

### 8.12 Articles (`/admin/articles`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/` | Создать статью | ✅ JWT (Admin) |
| GET | `/` | Получить список статей | ✅ JWT (Admin) |
| GET | `/:articleId` | Получить детали статьи | ✅ JWT (Admin) |
| PATCH | `/:articleId` | Обновить статью | ✅ JWT (Admin) |
| DELETE | `/:articleId` | Удалить статью | ✅ JWT (Admin) |

---

## 9. Public API

**Базовый путь:** `/public`

**Описание:** Публичное API без требования аутентификации. Для отображения информации в приложении/сайте.

### 9.1 Articles (`/public/articles`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список статей | ❌ Public |
| GET | `/:articleId` | Получить детали статьи | ❌ Public |

### 9.2 Shops (`/public/shops`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/` | Получить список магазинов | ❌ Public |
| GET | `/:shopId` | Получить детали магазина | ❌ Public |

### 9.3 Shop Products (`/public/shop-products`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/shop/:shopId` | Получить товары магазина | ❌ Public |
| GET | `/:shopProductId` | Получить детали товара | ❌ Public |

### 9.4 Images (`/public/images`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| GET | `/:imageName` | Получить изображение | ❌ Public |

**Примечание:** Изображения доступны по прямым ссылкам без префикса `/public/images` в зависимости от конфигурации storage.

### 9.5 DaData (`/public/dadata`)

| Метод | Path | Описание | Auth |
|-------|------|----------|------|
| POST | `/suggest/address` | Подсказки адресов (интеграция с DaData) | ❌ Public |

---

## 10. Коды ошибок

### HTTP Status Codes

| Код | Название | Использование |
|-----|----------|---------------|
| 200 | OK | Успешный GET/PATCH запрос |
| 201 | Created | Успешный POST запрос (создание ресурса) |
| 204 | No Content | Успешный DELETE запрос |
| 400 | Bad Request | Ошибка валидации (невалидный DTO) |
| 401 | Unauthorized | Отсутствует или невалидный JWT токен |
| 403 | Forbidden | Недостаточно прав для операции |
| 404 | Not Found | Ресурс не найден |
| 409 | Conflict | Конфликт (например, дубликат телефона) |
| 422 | Unprocessable Entity | Бизнес-правило нарушено |
| 500 | Internal Server Error | Серверная ошибка |

### Domain Error Codes

Используются в `DomainError` для детализации ошибок:

```typescript
enum DomainErrorCode {
  // Domain errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  INVARIANT = 'INVARIANT',
  CONCURRENCY = 'CONCURRENCY',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAVAILABLE = 'UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Database errors
  DB_DUPLICATE_KEY = 'DB_DUPLICATE_KEY',
  DB_CAST_ERROR = 'DB_CAST_ERROR',
  DB_VALIDATION_ERROR = 'DB_VALIDATION_ERROR',
  DB_DOCUMENT_NOT_FOUND = 'DB_DOCUMENT_NOT_FOUND',
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
}
```

### Примеры ошибок

**400 Bad Request (валидация)**
```json
{
  "statusCode": 400,
  "message": [
    "shopId must be a mongodb id",
    "items should not be empty"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Доступ запрещен. Этот заказ принадлежит другому клиенту.",
  "error": "Forbidden"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Заказ не найден",
  "error": "Not Found"
}
```

**409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Пользователь с таким телефоном уже существует",
  "error": "Conflict"
}
```

**422 Unprocessable Entity**
```json
{
  "statusCode": 422,
  "message": "Недостаточно товара на складе. Доступно: 5, запрошено: 10",
  "error": "Unprocessable Entity"
}
```

---

## Заключение

Эта документация описывает основные endpoints FruktGo API. 

**Для более детальной информации:**
- **Swagger UI:** `https://api.fruktgo.com/api` - интерактивная документация с примерами
- **Architecture:** `docs/architecture.md` - архитектурные решения
- **Tech Guidelines:** `docs/tech-guidelines.md` - технические паттерны реализации
- **Business Flows:** `docs/business/` - бизнес-логика по ролям

**Важные моменты:**
1. Все endpoints (кроме Public и Auth) требуют JWT токен
2. Используется строгая валидация через DTOs
3. Ошибки возвращаются в едином формате
4. API построен на принципе role-based access
5. Для загрузки файлов используется `multipart/form-data`

---

> **Примечание:** Документ обновляется по мере добавления новых endpoints. При изменении API обязательно обновляйте этот файл и Swagger аннотации.

