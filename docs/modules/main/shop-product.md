# Shop-Product Module

> **Модуль:** `src/modules/shop-product`  
> **Назначение:** Товары, прикрепленные к конкретным магазинам

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

**Shop-Product Module** - связующий модуль между Product (мастер-каталог) и Shop (магазин). ShopProduct - это конкретный товар в конкретном магазине с остатками, статусом и изображениями.

### Основные возможности

- ✅ Прикрепление товаров к магазинам
- ✅ Управление остатками (stockQuantity)
- ✅ Статусы доступности (ACTIVE, PAUSED, OUT_OF_STOCK, ARCHIVED)
- ✅ Дополнительные изображения (специфичные для магазина)
- ✅ Статистика продаж и списаний
- ✅ Связь Product ↔ Shop

### Бизнес-контекст

**Зачем нужен ShopProduct:**
1. **Разные остатки** - один товар в разных магазинах имеет разное количество
2. **Разная доступность** - товар может быть активен в одном магазине и отключен в другом
3. **Разные изображения** - магазин может добавить свои фото товара
4. **Локальная статистика** - продажи и списания по каждому магазину

**Workflow:**
1. Продавец создает Product (общий товар)
2. Продавец прикрепляет Product к Shop → создается ShopProduct
3. Клиент видит ShopProduct в витрине магазина
4. При заказе используется ShopProduct.stockQuantity

---

## 2. Схема данных

### ShopProduct Schema

**Файл:** `shop-product.schema.ts`

```typescript
class ShopProduct {
  _id: Types.ObjectId;
  shopProductId: string;  // Виртуальное поле
  
  // Связи
  pinnedTo: Types.ObjectId;         // Магазин (Shop, required)
  product: Types.ObjectId | Product; // Товар (Product, required)
  
  // Остатки
  stockQuantity: number;            // Количество в наличии (default: 0)
  
  // Статус
  status: ShopProductStatus;        // ACTIVE/PAUSED/OUT_OF_STOCK/ARCHIVED
  
  // Статистика (локальная для магазина)
  last7daysSales: number;           // Продажи за 7 дней (default: 0)
  last7daysWriteOff: number;        // Списано за 7 дней (default: 0)
  
  // Дополнительные изображения
  images: Types.ObjectId[];         // Массив Image
  
  // Метаданные
  createdAt: Date;
  updatedAt: Date;
}
```

### Плагины

- **mongooseLeanVirtuals**
- **mongoosePaginate**

---

## 3. Енумы

### ShopProductStatus

Статус доступности товара в магазине.

```typescript
enum ShopProductStatus {
  ACTIVE = 'active',           // Активен, доступен для заказа
  PAUSED = 'paused',           // Приостановлен (временно недоступен)
  OUT_OF_STOCK = 'outOfStock', // Нет в наличии
  ARCHIVED = 'archived'        // Архивирован (не показывается)
}
```

**Логика:**
- `ACTIVE` - товар доступен, `stockQuantity > 0`
- `PAUSED` - товар временно отключен продавцом
- `OUT_OF_STOCK` - `stockQuantity = 0` (автоматически)
- `ARCHIVED` - товар больше не продается в этом магазине

---

## 4. Commands (Write операции)

### CreateShopProductCommand

Прикрепление товара к магазину.

```typescript
class CreateShopProductCommand {
  constructor(
    public readonly shopProductId: string,  // Pre-generated ID
    public readonly payload: {
      productId: string;       // Какой товар
      shopId: string;          // К какому магазину
      stockQuantity?: number;  // Начальные остатки (default: 0)
      status?: ShopProductStatus;  // default: ACTIVE
    }
  )
}
```

**Бизнес-логика:**
- Проверяет, что Product принадлежит владельцу Shop
- Проверяет, что товар еще не прикреплен к этому магазину
- Обновляет `product.totalStockQuantity`
- Обновляет `shop.statistics.productsCount`

**Исключения:**
- `CONFLICT` - товар уже прикреплен к этому магазину
- `FORBIDDEN` - товар не принадлежит владельцу магазина

---

### UpdateShopProductCommand

Обновление данных товара в магазине.

```typescript
class UpdateShopProductCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      stockQuantity?: number;
      status?: ShopProductStatus;
    }
  )
}
```

**Бизнес-логика:**
- При изменении `stockQuantity`:
  - Обновляется `product.totalStockQuantity`
  - Если `stockQuantity = 0`, статус → `OUT_OF_STOCK`
- При изменении статуса валидация допустимых переходов

---

### ArchiveShopProductCommand

Архивирование товара (открепление от магазина).

```typescript
class ArchiveShopProductCommand {
  constructor(
    public readonly shopProductId: string
  )
}
```

**Бизнес-логика:**
- Статус → `ARCHIVED`
- Товар больше не показывается в витрине
- `product.totalStockQuantity` пересчитывается

---

### AddShopProductImageCommand

Добавление изображения к товару магазина.

```typescript
class AddShopProductImageCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly shopProductImageFile: Express.Multer.File
  )
}
```

**Бизнес-логика:**
- Загружает изображение через `ImagesPort`
- Добавляет ID в массив `images`

---

### RemoveShopProductImageCommand

Удаление изображения.

```typescript
class RemoveShopProductImageCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly shopProductImageId: string
  )
}
```

**Бизнес-логика:**
- Удаляет изображение через `ImagesPort`
- Удаляет ID из массива `images`

---

## 5. Queries (Read операции)

### GetShopProductQuery

Получить один товар магазина.

```typescript
class GetShopProductQuery {
  constructor(
    public readonly shopProductId: string,
    public readonly options?: {
      select?: (keyof ShopProduct)[];
      populateProduct?: boolean;   // Populate Product данные
    }
  )
}
```

---

### GetShopProductsQuery

Получить список товаров магазина.

```typescript
class GetShopProductsQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;              // Товары конкретного магазина
      productId?: string;           // Где прикреплен конкретный Product
      statuses?: ShopProductStatus[];
      inStock?: boolean;            // stockQuantity > 0
    },
    public readonly options?: {
      select?: (keyof ShopProduct)[];
      populateProduct?: boolean;
    }
  )
}
```

**Примеры:**
```typescript
// Активные товары магазина с остатками
new GetShopProductsQuery({
  shopId: '507f...',
  statuses: [ShopProductStatus.ACTIVE],
  inStock: true
})

// Где прикреплен конкретный товар
new GetShopProductsQuery({
  productId: '507f...'
})
```

---

## 6. Port (Интерфейс)

**Файл:** `shop-product.port.ts`

```typescript
interface ShopProductPort {
  // QUERIES
  getShopProduct(
    query: GetShopProductQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<ShopProduct | null>;
  
  getShopProducts(
    query: GetShopProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<ShopProduct>>;

  // COMMANDS
  createShopProduct(
    command: CreateShopProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<ShopProduct>;
  
  updateShopProduct(
    command: UpdateShopProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  archiveShopProduct(
    command: ArchiveShopProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  addShopProductImage(
    command: AddShopProductImageCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  removeShopProductImage(
    command: RemoveShopProductImageCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const SHOP_PRODUCT_PORT = Symbol('SHOP_PRODUCT_PORT');
```

---

## 7. Связи с другими модулями

### Domain Dependencies

#### ProductPort

**Связь:** ShopProduct → Product (N:1)

**Использование:**
- ShopProduct ссылается на Product
- При изменении остатков обновляется `product.totalStockQuantity`

#### ShopPort

**Связь:** ShopProduct → Shop (N:1)

**Использование:**
- ShopProduct прикреплен к Shop
- При создании обновляется `shop.statistics.productsCount`

---

### Infrastructure Dependencies

#### ImagesPort

**Связь:** ShopProduct → Images (через `images`)

**Использование:**
- Загрузка дополнительных изображений товара

---

### Consumers

#### Interface Layer

- **SellerShopProductsRoleService** - управление товарами (`/seller/shop-products`)
- **ShopShopProductsRoleService** - витрина магазина (`/shop/shop-products`)
- **PublicShopProductsController** - публичный каталог (`/public/shop-products`)

#### Domain Modules

- **OrderService** - проверка наличия товара при создании заказа
- **CartService** - добавление товаров в корзину

---

## 8. API Endpoints

### Seller API (`/seller/shop-products`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Прикрепить товар к магазину | CreateShopProductCommand |
| GET | `/` | Товары моих магазинов | GetShopProductsQuery |
| GET | `/:shopProductId` | Детали товара | GetShopProductQuery |
| PATCH | `/:shopProductId` | Обновить остатки/статус | UpdateShopProductCommand |
| DELETE | `/:shopProductId` | Архивировать | ArchiveShopProductCommand |
| POST | `/:shopProductId/images` | Добавить изображение | AddShopProductImageCommand |
| DELETE | `/:shopProductId/images/:imageId` | Удалить изображение | RemoveShopProductImageCommand |

**Авторизация:** JWT токен с типом `seller`.

---

### Shop API (`/shop/shop-products`)

| Метод | Path | Описание | Query |
|-------|------|----------|-------|
| GET | `/` | Товары магазина | GetShopProductsQuery |
| PATCH | `/:shopProductId/stock` | Обновить остатки | UpdateShopProductCommand |

**Авторизация:** JWT токен с типом `shop`.

---

### Public API (`/public/shop-products`)

| Метод | Path | Описание | Query |
|-------|------|----------|-------|
| GET | `/` | Каталог магазина | GetShopProductsQuery (только ACTIVE) |
| GET | `/:shopProductId` | Детали товара | GetShopProductQuery |

**Авторизация:** Не требуется.

**Автофильтрация:**
- Только `status = ACTIVE`
- Только `stockQuantity > 0`

---

## Примеры использования

### Прикрепление товара к магазину

```typescript
const command = new CreateShopProductCommand(
  new Types.ObjectId().toString(),
  {
    productId: '507f...',  // Яблоко Гала
    shopId: '507f...',     // Магазин №1
    stockQuantity: 50,     // 50 кг в наличии
    status: ShopProductStatus.ACTIVE
  }
);

const shopProduct = await shopProductPort.createShopProduct(command);
console.log(shopProduct.shopProductId);
// Теперь товар доступен в магазине
```

---

### Обновление остатков

```typescript
const command = new UpdateShopProductCommand(
  shopProductId,
  {
    stockQuantity: 30  // Осталось 30 кг
  }
);

await shopProductPort.updateShopProduct(command);
// product.totalStockQuantity также обновится
```

---

### Получение каталога магазина

```typescript
const query = new GetShopProductsQuery(
  {
    shopId: '507f...',
    statuses: [ShopProductStatus.ACTIVE],
    inStock: true
  },
  {
    populateProduct: true  // Получить данные Product
  }
);

const result = await shopProductPort.getShopProducts(query, {
  pagination: { page: 1, pageSize: 20 }
});

result.docs.forEach(sp => {
  console.log(sp.product.productName);  // Populated
  console.log(sp.stockQuantity);
  console.log(sp.product.price);
});
```

---

### Добавление изображения

```typescript
const command = new AddShopProductImageCommand(
  shopProductId,
  req.file  // Multer file
);

await shopProductPort.addShopProductImage(command);
// Изображение добавлено в массив images
```

---

## Заключение

**Shop-Product Module** - ключевой связующий модуль между Product и Shop.

**Ключевые особенности:**
- ✅ Связь Product ↔ Shop (M:N)
- ✅ Управление остатками по магазинам
- ✅ Статусы доступности
- ✅ Локальная статистика
- ✅ Дополнительные изображения
- ✅ Автоматическое управление `product.totalStockQuantity`

**Архитектурный паттерн:** Association Class (класс-связка)

**Двухуровневая модель:**
```
Seller
  └── Product (мастер-каталог)
       └── ShopProduct (в магазинах)
            ├── Shop A: 50кг, ACTIVE
            ├── Shop B: 30кг, ACTIVE
            └── Shop C: 0кг, OUT_OF_STOCK
```

**Связанные модули:**
- **Product** - мастер-товар
- **Shop** - магазин
- **Order** - использует ShopProduct при заказе
- **Cart** - добавляет ShopProduct в корзину

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
