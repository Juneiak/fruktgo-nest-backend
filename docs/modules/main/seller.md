# Seller Module

> **Модуль:** `src/modules/seller`  
> **Назначение:** Управление продавцами (юридические лица/ИП) на платформе

---

## Содержание

- [1. Обзор](#1-обзор)
- [2. Схема данных](#2-схема-данных)
- [3. Commands](#3-commands-write-операции)
- [4. Queries](#4-queries-read-операции)
- [5. Port](#5-port-интерфейс)
- [6. Связи с модулями](#6-связи-с-другими-модулями)
- [7. API Endpoints](#7-api-endpoints)

---

## 1. Обзор

**Seller Module** - управление продавцами (бизнес-субъекты), которые владеют магазинами на платформе. Продавец может иметь несколько магазинов, нанимать сотрудников, управлять товарами.

### Основные возможности

- ✅ Регистрация продавцов через Telegram
- ✅ Юридическая информация (ИНН, название компании)
- ✅ Финансовый аккаунт (SellerAccount)
- ✅ Владение несколькими магазинами
- ✅ Верификация и блокировка
- ✅ Статистика бизнеса
- ✅ Логотип компании

### Бизнес-контекст

**Seller** - это:
- Юридическое лицо или ИП
- Владелец одного или нескольких магазинов (Shop)
- Работодатель для сотрудников (Employee)
- Владелец товаров (Product)
- Имеет финансовый аккаунт для расчетов с платформой

---

## 2. Схема данных

### Seller Schema

**Файл:** `seller.schema.ts`

```typescript
class Seller {
  _id: Types.ObjectId;
  sellerId: string;  // Виртуальное поле
  
  // Telegram данные
  telegramId: number;              // Уникальный ID (unique)
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  
  // Контакты
  phone: string;                   // Уникальный (unique, required)
  email: string;                   // Уникальный (unique, required)
  
  // Юридическая информация
  companyName: string;             // Название компании (required)
  inn: string;                     // ИНН (unique, required)
  
  // Визуал
  sellerLogo?: Types.ObjectId | null;  // Логотип компании (Image)
  
  // Финансы
  account: Types.ObjectId;         // SellerAccount (required)
  
  // Статусы
  blocked: Blocked;                // Блокировка
  verifiedStatus: VerifiedStatus;  // Верификация (default: IS_CHECKING)
  
  // Связи
  shops: Types.ObjectId[];         // Магазины продавца (Shop[])
  
  // Статистика
  statistics: SellerStatistics;
  
  // Активность
  lastLoginAt: Date | null;        // Последний вход
  
  // Для админов
  internalNote?: string;           // Внутренняя заметка
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### SellerStatistics

```typescript
interface SellerStatistics {
  totalSales: number;        // Общая выручка
  totalOrders: number;       // Всего заказов
  shopsCount: number;        // Количество магазинов
  employeesCount: number;    // Количество сотрудников
  productsCount: number;     // Количество товаров
}
```

### Индексы

Уникальные:
- `phone` - unique
- `email` - unique
- `inn` - unique
- `telegramId` - unique

### Плагины

- **mongooseLeanVirtuals**
- **mongoosePaginate**

---

## 3. Commands (Write операции)

### CreateSellerCommand

Регистрация нового продавца.

```typescript
class CreateSellerCommand {
  constructor(
    public readonly payload: {
      sellerAccountId: string;   // ID финансового аккаунта
      telegramId: number;
      phone: string;
      companyName: string;
      inn: string;
      email: string;
      telegramUsername?: string;
      telegramFirstName?: string;
      telegramLastName?: string;
    },
    public readonly sellerId?: string  // Опциональный ID
  )
}
```

**Бизнес-логика:**
- Проверяет уникальность: `phone`, `email`, `inn`, `telegramId`
- Создает связь с `SellerAccount`
- Устанавливает `verifiedStatus = IS_CHECKING`
- Инициализирует пустую статистику

**Исключения:**
- `CONFLICT` - если продавец с такими данными уже существует

---

### UpdateSellerCommand

Обновление данных продавца.

```typescript
class UpdateSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: {
      phone?: string;
      verifiedStatus?: VerifiedStatus;
      internalNote?: string | null;
      companyName?: string;
      inn?: string;
      email?: string;
      sellerLogo?: Express.Multer.File | null;  // null = удалить
    }
  )
}
```

**Бизнес-логика:**
- При изменении логотипа:
  - `null` → удаляет текущий логотип
  - `undefined` → не трогает
  - `File` → загружает новый, удаляет старый

---

### BlockSellerCommand

Блокировка продавца.

```typescript
class BlockSellerCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: {
      status: BlockStatus;
      reason?: string | null;
      code?: string | null;
      blockedUntil?: Date | null;
    }
  )
}
```

**Бизнес-логика:**
- При блокировке автоматически блокируются все магазины продавца
- Закрываются все активные смены

---

## 4. Queries (Read операции)

### GetSellerQuery

Получить одного продавца.

```typescript
class GetSellerQuery {
  constructor(
    public readonly filter?: {
      sellerId?: string;
      telegramId?: number;
      accountId?: string;   // По финансовому аккаунту
      phone?: string;
      inn?: string;
    },
    public readonly options?: {
      select?: (keyof Seller)[]
    }
  )
}
```

**Гибкость:** Можно искать по любому из полей.

---

### GetSellersQuery

Получить список продавцов.

```typescript
class GetSellersQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
    },
    public readonly options?: {
      select?: (keyof Seller)[]
    }
  )
}
```

**Примеры:**
```typescript
// Верифицированные продавцы
new GetSellersQuery({
  verifiedStatuses: [VerifiedStatus.VERIFIED],
  blockedStatuses: [BlockStatus.ACTIVE]
})
```

---

## 5. Port (Интерфейс)

**Файл:** `seller.port.ts`

```typescript
interface SellerPort {
  // QUERIES
  getSeller(
    query: GetSellerQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Seller | null>;
  
  getSellers(
    query: GetSellersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Seller>>;

  // COMMANDS
  createSeller(
    command: CreateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Seller>;
  
  updateSeller(
    command: UpdateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  blockSeller(
    command: BlockSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const SELLER_PORT = Symbol('SELLER_PORT');
```

---

## 6. Связи с другими модулями

### Domain Dependencies

#### SellerAccountPort (Finance)

**Связь:** Seller → SellerAccount (1:1)

**Использование:**
- При создании продавца создается финансовый аккаунт
- Все транзакции проходят через этот аккаунт

#### ShopPort

**Связь:** Seller → Shop (1:N)

**Использование:**
- Продавец владеет несколькими магазинами
- Массив `shops` содержит ID всех магазинов

#### ProductPort

**Связь:** Seller → Product (1:N)

**Использование:**
- Продавец создает товары
- Товары привязываются через `product.owner`

#### EmployeePort

**Связь:** Seller → Employee (1:N через employer)

**Использование:**
- Продавец нанимает сотрудников
- Сотрудники привязываются через `employee.employer`

---

### Infrastructure Dependencies

#### ImagesPort

**Связь:** Seller → Images (через `sellerLogo`)

**Использование:**
- Загрузка логотипа компании

---

### Consumers

#### Interface Layer

- **SellerMeRoleService** - профиль продавца (`/seller/me`)
- **AdminSellersRoleService** - управление продавцами (`/admin/sellers`)

---

## 7. API Endpoints

### Seller API (`/seller/me`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить профиль | GetSellerQuery |
| PATCH | `/` | Обновить профиль | UpdateSellerCommand |
| PATCH | `/logo` | Загрузить логотип | UpdateSellerCommand |

**Авторизация:** JWT токен с типом `seller`.

---

### Admin API (`/admin/sellers`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Создать продавца | CreateSellerCommand |
| GET | `/` | Список продавцов | GetSellersQuery |
| GET | `/:sellerId` | Детали продавца | GetSellerQuery |
| PATCH | `/:sellerId` | Обновить продавца | UpdateSellerCommand |
| PATCH | `/:sellerId/block` | Заблокировать | BlockSellerCommand |

**Авторизация:** JWT токен с типом `admin`.

---

## Примеры использования

### Создание продавца

```typescript
const command = new CreateSellerCommand({
  sellerAccountId: accountId,
  telegramId: 123456789,
  phone: '+79991234567',
  companyName: 'ООО "Фруктовая лавка"',
  inn: '1234567890',
  email: 'seller@example.com',
  telegramUsername: 'seller_shop'
});

const seller = await sellerPort.createSeller(command);
console.log(seller.sellerId);
console.log(seller.account); // Связь с SellerAccount
```

---

### Обновление логотипа

```typescript
const command = new UpdateSellerCommand(
  sellerId,
  {
    sellerLogo: req.file  // Multer file
  }
);

await sellerPort.updateSeller(command);
```

---

### Блокировка продавца

```typescript
const command = new BlockSellerCommand(
  sellerId,
  {
    status: BlockStatus.BLOCKED,
    reason: 'Нарушение правил платформы',
    code: 'TERMS_VIOLATION'
  }
);

await sellerPort.blockSeller(command);
// Все магазины продавца также заблокируются
```

---

## Заключение

**Seller Module** - ключевой модуль бизнес-логики платформы.

**Ключевые особенности:**
- ✅ Юридическая информация (ИНН, компания)
- ✅ Финансовый аккаунт для расчетов
- ✅ Владение магазинами, товарами, сотрудниками
- ✅ Статистика бизнеса
- ✅ Верификация и блокировка

**Связанные модули:**
- **SellerAccount** (Finance) - финансовый аккаунт
- **Shop** - магазины продавца
- **Product** - товары продавца
- **Employee** - сотрудники продавца
- **JobApplication** - заявки на работу

**Иерархия:**
```
Seller (юридическое лицо)
  └── Shop (магазин 1, 2, 3...)
       ├── Employee (сотрудники)
       ├── ShopProduct (товары в магазине)
       └── Shift (смены)
```

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
