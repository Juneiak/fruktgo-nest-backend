# Shop Module

> **Модуль:** `src/modules/shop`  
> **Назначение:** Управление магазинами (торговые точки продавцов)

---

## Содержание

- [1. Обзор](#1-обзор)
- [2. Схема данных](#2-схема-данных)
- [3. Енумы](#3-енумы)
- [4. Commands](#4-commands-write-операции)
- [5. Queries](#5-queries-read-операции)
- [6. Port](#6-port-интерфейс)
- [7. Связи с модулями](#7-связи-с-другими-модулями)
- [8. API Endpoints](#8-api-endpoints)

---

## 1. Обзор

**Shop Module** - управление конкретными торговыми точками/магазинами. Магазин принадлежит продавцу (Seller), имеет адрес, режим работы, SLA параметры и собственный финансовый аккаунт.

### Основные возможности

- ✅ Создание магазинов продавцами
- ✅ Адрес и зона обслуживания
- ✅ Режим работы (открыт/закрыт/пауза)
- ✅ SLA параметры (время принятия/сборки заказа)
- ✅ Текущая смена
- ✅ Активные заказы
- ✅ Финансовый аккаунт (ShopAccount)
- ✅ Статистика и рейтинг
- ✅ Верификация и блокировка

### Бизнес-контекст

**Shop** - это:
- Конкретная точка продаж с адресом
- Место работы сотрудников (Employee)
- Место хранения товаров (ShopProduct)
- Место выполнения заказов (Order)
- Имеет собственный финансовый аккаунт

**Важно:** Все заказы всегда привязаны к конкретному магазину.

---

## 2. Схема данных

### Shop Schema

**Файл:** `shop.schema.ts`

```typescript
class Shop {
  _id: Types.ObjectId;
  shopId: string;  // Виртуальное поле
  
  // Основное
  shopName: string;                // Название магазина (required)
  city: string;                    // Город (required)
  address?: Types.ObjectId | null; // Адрес (Address)
  aboutShop?: string;              // Описание магазина
  shopImage?: Types.ObjectId | null; // Изображение (Image)
  
  // Владение
  owner: Types.ObjectId;           // Продавец (Seller, required)
  
  // Финансы
  account: Types.ObjectId;         // ShopAccount (required)
  
  // Режим работы
  status: ShopStatus;              // OPENED/CLOSED/PAUSED (default: CLOSED)
  openAt?: string;                 // Время открытия (например, "09:00")
  closeAt?: string;                // Время закрытия (например, "22:00")
  
  // SLA параметры
  minOrderSum: number;             // Минимальная сумма заказа (default: 1)
  acceptanceTimeLimit: number;     // Лимит принятия заказа (секунды)
  assemblyTimeLimit: number;       // Лимит сборки заказа (секунды)
  minWeightDifferencePercentage: number; // Допустимое отклонение веса (%)
  
  // Текущее состояние
  currentShift: Types.ObjectId | null;   // Текущая смена (Shift)
  activeOrders: Types.ObjectId[];        // Активные заказы (Order[])
  
  // Статусы
  blocked: Blocked;                // Блокировка
  verifiedStatus: VerifiedStatus;  // Верификация (default: IS_CHECKING)
  
  // Статистика
  statistics: ShopStatistics;
  
  // Заметки
  sellerNote?: string;             // Заметка продавца
  internalNote?: string;           // Внутренняя заметка админа
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### ShopStatistics

```typescript
interface ShopStatistics {
  avgRating: number;         // Средний рейтинг (0-5)
  totalSales: number;        // Общая выручка
  ratingsCount: number;      // Количество оценок
  ordersCount: number;       // Всего заказов
  productsCount: number;     // Количество товаров
  employeesCount: number;    // Количество сотрудников
}
```

### Индексы

Нет уникальных индексов (несколько магазинов могут иметь одинаковые названия).

### Плагины

- **mongooseLeanVirtuals**
- **mongoosePaginate**

---

## 3. Енумы

### ShopStatus

Статус работы магазина.

```typescript
enum ShopStatus {
  OPENED = 'opened',  // Магазин открыт, принимает заказы
  CLOSED = 'closed',  // Магазин закрыт
  PAUSED = 'paused'   // Магазин на паузе (временно не принимает заказы)
}
```

**Логика:**
- `CLOSED` - нерабочее время или магазин закрыт
- `OPENED` - магазин работает, есть открытая смена
- `PAUSED` - смена открыта, но прием заказов приостановлен

---

## 4. Commands (Write операции)

### CreateShopCommand

Создание нового магазина.

```typescript
class CreateShopCommand {
  constructor(
    public readonly payload: {
      sellerId: string;          // Владелец
      shopAccountId: string;     // Финансовый аккаунт
      shopName: string;
      city: string;
      address?: {                // Опциональный адрес
        latitude: number;
        longitude: number;
        street: string;
        house: string;
        // ...
      };
      aboutShop?: string;
      openAt?: string;
      closeAt?: string;
      minOrderSum?: number;
      shopImageFile?: Express.Multer.File;
    },
    public readonly shopId?: string
  )
}
```

**Бизнес-логика:**
- Создает магазин со статусом `CLOSED`
- Добавляет ID магазина в массив `seller.shops`
- Создает адрес через `AddressesPort` (если передан)
- Загружает изображение (если есть)
- Устанавливает дефолтные SLA параметры

---

### UpdateShopCommand

Обновление данных магазина.

```typescript
class UpdateShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      shopName?: string;
      city?: string;
      aboutShop?: string | null;
      openAt?: string | null;
      closeAt?: string | null;
      status?: ShopStatus;
      minOrderSum?: number;
      acceptanceTimeLimit?: number;
      assemblyTimeLimit?: number;
      minWeightDifferencePercentage?: number;
      sellerNote?: string | null;
      shopImageFile?: Express.Multer.File | null;
    }
  )
}
```

**Бизнес-логика:**
- Обновляются только переданные поля
- При изменении статуса на `OPENED` проверяется наличие открытой смены

---

### BlockShopCommand

Блокировка магазина.

```typescript
class BlockShopCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: BlockPayload
  )
}
```

**Бизнес-логика:**
- Закрывает текущую смену (если открыта)
- Отменяет все активные заказы
- Статус → `CLOSED`

---

## 5. Queries (Read операции)

### GetShopQuery

Получить один магазин.

```typescript
class GetShopQuery {
  constructor(
    public readonly shopId: string,
    public readonly options?: {
      select?: (keyof Shop)[]
    }
  )
}
```

---

### GetShopsQuery

Получить список магазинов.

```typescript
class GetShopsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;         // Магазины конкретного продавца
      city?: string;             // Магазины в городе
      statuses?: ShopStatus[];   // По статусу работы
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
    },
    public readonly options?: {
      select?: (keyof Shop)[]
    }
  )
}
```

**Примеры:**
```typescript
// Открытые магазины в городе
new GetShopsQuery({
  city: 'Москва',
  statuses: [ShopStatus.OPENED],
  blockedStatuses: [BlockStatus.ACTIVE]
})

// Все магазины продавца
new GetShopsQuery({
  sellerId: '507f...'
})
```

---

## 6. Port (Интерфейс)

**Файл:** `shop.port.ts`

```typescript
interface ShopPort {
  // QUERIES
  getShop(
    query: GetShopQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Shop | null>;
  
  getShops(
    query: GetShopsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Shop>>;

  // COMMANDS
  createShop(
    command: CreateShopCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Shop>;
  
  updateShop(
    command: UpdateShopCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  blockShop(
    command: BlockShopCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const SHOP_PORT = Symbol('SHOP_PORT');
```

---

## 7. Связи с другими модулями

### Domain Dependencies

#### SellerPort

**Связь:** Shop → Seller (N:1)

**Использование:**
- Магазин принадлежит продавцу
- При создании магазина обновляется `seller.shops`

#### ShopAccountPort (Finance)

**Связь:** Shop → ShopAccount (1:1)

**Использование:**
- У каждого магазина свой финансовый аккаунт
- Все транзакции магазина проходят через него

#### ShiftPort

**Связь:** Shop ↔ Shift (1:1 активная)

**Использование:**
- `shop.currentShift` указывает на открытую смену
- При открытии смены: `shop.currentShift = shiftId`, `shop.status = OPENED`
- При закрытии смены: `shop.currentShift = null`

#### ShopProductPort

**Связь:** Shop → ShopProduct (1:N)

**Использование:**
- Товары прикреплены к магазину через `shopProduct.pinnedTo`

#### EmployeePort

**Связь:** Shop → Employee (1:N через pinnedTo)

**Использование:**
- Сотрудники прикреплены к магазину

---

### Infrastructure Dependencies

#### AddressesPort

**Связь:** Shop → Addresses (через `address`)

**Использование:**
- Создание/обновление адреса магазина

#### ImagesPort

**Связь:** Shop → Images (через `shopImage`)

**Использование:**
- Загрузка изображения магазина

---

### Consumers

#### Interface Layer

- **SellerShopsRoleService** - управление магазинами (`/seller/shops`)
- **ShopMeRoleService** - профиль магазина (`/shop/me`)
- **AdminShopsRoleService** - админ панель (`/admin/shops`)
- **PublicShopsController** - публичный список магазинов (`/public/shops`)

---

## 8. API Endpoints

### Seller API (`/seller/shops`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Создать магазин | CreateShopCommand |
| GET | `/` | Мои магазины | GetShopsQuery |
| GET | `/:shopId` | Детали магазина | GetShopQuery |
| PATCH | `/:shopId` | Обновить магазин | UpdateShopCommand |
| PATCH | `/:shopId/image` | Загрузить изображение | UpdateShopCommand |

**Авторизация:** JWT токен с типом `seller`.

---

### Shop API (`/shop/me`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Получить профиль магазина | GetShopQuery |
| PATCH | `/status` | Изменить статус | UpdateShopCommand |

**Авторизация:** JWT токен с типом `shop`.

---

### Admin API (`/admin/shops`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Все магазины | GetShopsQuery |
| GET | `/:shopId` | Детали магазина | GetShopQuery |
| PATCH | `/:shopId` | Обновить магазин | UpdateShopCommand |
| PATCH | `/:shopId/block` | Заблокировать | BlockShopCommand |

---

### Public API (`/public/shops`)

| Метод | Path | Описание | Query |
|-------|------|----------|-------|
| GET | `/` | Открытые магазины | GetShopsQuery (только OPENED) |
| GET | `/:shopId` | Детали магазина | GetShopQuery |

**Авторизация:** Не требуется.

---

## Примеры использования

### Создание магазина

```typescript
const command = new CreateShopCommand({
  sellerId: '507f...',
  shopAccountId: accountId,
  shopName: 'Фруктовая лавка №1',
  city: 'Москва',
  address: {
    latitude: 55.7558,
    longitude: 37.6173,
    street: 'Тверская',
    house: '1'
  },
  aboutShop: 'Свежие фрукты и овощи',
  openAt: '09:00',
  closeAt: '22:00',
  minOrderSum: 500
});

const shop = await shopPort.createShop(command);
console.log(shop.status); // "closed"
console.log(shop.account); // ShopAccount ID
```

---

### Открытие магазина (при открытии смены)

```typescript
// Происходит автоматически при открытии смены
const command = new UpdateShopCommand(
  shopId,
  { status: ShopStatus.OPENED }
);

await shopPort.updateShop(command);
// Теперь магазин принимает заказы
```

---

### Получение открытых магазинов в городе

```typescript
const query = new GetShopsQuery({
  city: 'Москва',
  statuses: [ShopStatus.OPENED],
  verifiedStatuses: [VerifiedStatus.VERIFIED],
  blockedStatuses: [BlockStatus.ACTIVE]
});

const result = await shopPort.getShops(query, {
  pagination: { page: 1, pageSize: 20 }
});
```

---

## Заключение

**Shop Module** - центральная сущность операционной деятельности.

**Ключевые особенности:**
- ✅ Конкретная торговая точка с адресом
- ✅ Финансовый аккаунт для расчетов
- ✅ SLA параметры для контроля качества
- ✅ Текущая смена и активные заказы
- ✅ Статусы работы (OPENED/CLOSED/PAUSED)
- ✅ Связь с Employee, ShopProduct, Shift, Order

**Иерархия:**
```
Seller
  └── Shop (магазин)
       ├── ShopAccount (финансы)
       ├── Shift (текущая смена)
       ├── Employee (сотрудники)
       ├── ShopProduct (товары)
       └── Order (заказы)
```

**Связанные модули:**
- **Seller** - владелец
- **ShopAccount** (Finance) - финансовый аккаунт
- **Shift** - смены работы
- **Employee** - сотрудники
- **ShopProduct** - товары в магазине
- **Order** - заказы

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
