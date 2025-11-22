# Product Module

> **Модуль:** `src/modules/product`  
> **Назначение:** Мастер-каталог товаров продавца (общие товары)

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

**Product Module** - мастер-каталог товаров. Product - это абстрактный товар продавца (например, "Яблоко Гала"), который затем прикрепляется к конкретным магазинам через ShopProduct.

### Основные возможности

- ✅ Создание товаров продавцом
- ✅ Категории товаров (фрукты, овощи, орехи и т.д.)
- ✅ Единицы измерения (кг, шт)
- ✅ Шаг продажи (0.1кг, 1шт и т.д.)
- ✅ Общая цена и количество
- ✅ Изображение товара
- ✅ Статистика продаж
- ✅ Виртуальная связь с ShopProduct

### Бизнес-контекст

**Product vs ShopProduct:**
- **Product** - общий товар продавца ("Яблоко Гала, 1кг, 250₽")
- **ShopProduct** - конкретный товар в магазине ("Яблоко Гала в Магазине №1, в наличии 50кг")

**Workflow:**
1. Продавец создает Product (общий товар)
2. Продавец прикрепляет Product к магазинам → создаются ShopProduct
3. Клиент видит ShopProduct в витрине магазина
4. При заказе используется ShopProduct

---

## 2. Схема данных

### Product Schema

**Файл:** `product.schema.ts`

```typescript
class Product {
  _id: Types.ObjectId;
  productId: string;  // Виртуальное поле
  
  // Основное
  productName: string;             // Название товара (required)
  productArticle?: string;         // Артикул
  category: ProductCategory;       // Категория (required)
  aboutProduct?: string;           // Описание
  origin?: string;                 // Происхождение (страна/регион)
  
  // Визуал
  cardImage?: Types.ObjectId | null;  // Изображение (Image)
  
  // Ценообразование
  price: number;                   // Базовая цена (required, min: 1)
  measuringScale: ProductMeasuringScale;  // КГ или ШТ (required)
  stepRate: ProductStepRate;       // Шаг продажи (required)
  
  // Остатки (агрегат из всех ShopProduct)
  totalStockQuantity: number;      // Общее количество (default: 0)
  
  // Владение
  owner: Types.ObjectId;           // Продавец (Seller, required)
  
  // Статистика
  statistics: ProductStatistics;
  
  // Виртуальная связь
  shopProducts: ShopProduct[];     // Виртуальное поле (populate)
  
  // Метаданные
  createdAt?: Date;
  updatedAt?: Date;
}
```

### ProductStatistics

```typescript
interface ProductStatistics {
  totalLast7daysSales: number;    // Продажи за 7 дней
  totalSales: number;             // Всего продано
  totalLast7daysWriteOff: number; // Списано за 7 дней
}
```

### Виртуальные связи

```typescript
ProductSchema.virtual('shopProducts', {
  ref: 'ShopProduct',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});
```

**Использование:** Можно получить все ShopProduct, связанные с Product.

### Индексы

```typescript
ProductSchema.index({ owner: 1, createdAt: -1 });
```

**Оптимизация:** Быстрый поиск товаров продавца.

---

## 3. Енумы

### ProductCategory

Категория товара.

```typescript
enum ProductCategory {
  FRUITS = 'fruits',         // Фрукты
  VEGETABLES = 'vegetables', // Овощи
  NUTS = 'nuts',            // Орехи
  DRIEDS = 'drieds',        // Сухофрукты
  OTHER = 'other'           // Прочее
}
```

---

### ProductMeasuringScale

Единица измерения.

```typescript
enum ProductMeasuringScale {
  KG = 'kg',   // Килограммы (весовой товар)
  PCS = 'pcs'  // Штуки (штучный товар)
}
```

---

### ProductStepRate

Шаг продажи (минимальное количество для заказа).

```typescript
enum ProductStepRate {
  STEP_0_1 = '0.1',   // 100 грамм
  STEP_0_2 = '0.2',   // 200 грамм
  STEP_0_3 = '0.3',   // 300 грамм
  STEP_0_5 = '0.5',   // 500 грамм
  STEP_1 = '1',       // 1 кг или 1 шт
  STEP_2 = '2',       // 2 кг или 2 шт
  STEP_5 = '5',       // 5 кг или 5 шт
  STEP_10 = '10'      // 10 кг или 10 шт
}
```

**Примеры:**
- Яблоки: `measuringScale = KG`, `stepRate = STEP_0_5` → продается по 0.5кг
- Апельсины: `measuringScale = PCS`, `stepRate = STEP_1` → продается поштучно

---

## 4. Commands (Write операции)

### CreateProductCommand

Создание нового товара.

```typescript
class CreateProductCommand {
  constructor(
    public readonly payload: {
      sellerId: string;                    // Владелец
      productName: string;
      category: ProductCategory;
      price: number;
      measuringScale: ProductMeasuringScale;
      stepRate: ProductStepRate;
      aboutProduct?: string;
      origin?: string;
      productArticle?: string;
      cardImageFile?: Express.Multer.File;
    },
    public readonly productId?: string
  )
}
```

**Бизнес-логика:**
- Создает товар со статусом готовности к прикреплению
- Устанавливает `totalStockQuantity = 0`
- Загружает изображение (если есть)
- Обновляет `seller.statistics.productsCount`

---

### UpdateProductCommand

Обновление товара.

```typescript
class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly payload: {
      productName?: string;
      category?: ProductCategory;
      price?: number;
      measuringScale?: ProductMeasuringScale;
      stepRate?: ProductStepRate;
      aboutProduct?: string | null;
      origin?: string | null;
      productArticle?: string | null;
      cardImageFile?: Express.Multer.File;
    }
  )
}
```

**Бизнес-логика:**
- При изменении цены обновляется во всех ShopProduct
- При изменении изображения удаляется старое

---

## 5. Queries (Read операции)

### GetProductQuery

Получить один товар.

```typescript
class GetProductQuery {
  constructor(
    public readonly productId: string,
    public readonly options?: {
      select?: (keyof Product)[];
      populateShopProducts?: boolean;  // Получить связанные ShopProduct
    }
  )
}
```

---

### GetProductsQuery

Получить список товаров.

```typescript
class GetProductsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;           // Товары продавца
      categories?: ProductCategory[];
      measuringScales?: ProductMeasuringScale[];
      minPrice?: number;
      maxPrice?: number;
    },
    public readonly options?: {
      select?: (keyof Product)[];
      populateShopProducts?: boolean;
    }
  )
}
```

**Примеры:**
```typescript
// Все фрукты продавца
new GetProductsQuery({
  sellerId: '507f...',
  categories: [ProductCategory.FRUITS]
})

// Весовые товары в ценовом диапазоне
new GetProductsQuery({
  measuringScales: [ProductMeasuringScale.KG],
  minPrice: 100,
  maxPrice: 500
})
```

---

## 6. Port (Интерфейс)

**Файл:** `product.port.ts`

```typescript
interface ProductPort {
  // QUERIES
  getProduct(
    query: GetProductQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Product | null>;
  
  getProducts(
    query: GetProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Product>>;

  // COMMANDS
  createProduct(
    command: CreateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Product>;
  
  updateProduct(
    command: UpdateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
  
  deleteProduct(
    productId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void>;
}

export const PRODUCT_PORT = Symbol('PRODUCT_PORT');
```

---

## 7. Связи с другими модулями

### Domain Dependencies

#### SellerPort

**Связь:** Product → Seller (N:1)

**Использование:**
- Товар принадлежит продавцу
- При создании обновляется `seller.statistics.productsCount`

#### ShopProductPort

**Связь:** Product ↔ ShopProduct (1:N)

**Использование:**
- Product прикрепляется к магазинам через ShopProduct
- Виртуальная связь для populate
- При удалении Product удаляются все ShopProduct

---

### Infrastructure Dependencies

#### ImagesPort

**Связь:** Product → Images (через `cardImage`)

**Использование:**
- Загрузка изображения товара

---

### Consumers

#### Interface Layer

- **SellerProductsRoleService** - управление товарами (`/seller/products`)
- **AdminProductsRoleService** - админ панель (`/admin/products`)

---

## 8. API Endpoints

### Seller API (`/seller/products`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| POST | `/` | Создать товар | CreateProductCommand |
| GET | `/` | Мои товары | GetProductsQuery |
| GET | `/:productId` | Детали товара | GetProductQuery |
| PATCH | `/:productId` | Обновить товар | UpdateProductCommand |
| DELETE | `/:productId` | Удалить товар | deleteProduct() |

**Авторизация:** JWT токен с типом `seller`.

---

### Admin API (`/admin/products`)

| Метод | Path | Описание | Command/Query |
|-------|------|----------|---------------|
| GET | `/` | Все товары | GetProductsQuery |
| GET | `/:productId` | Детали товара | GetProductQuery |
| PATCH | `/:productId` | Обновить товар | UpdateProductCommand |
| DELETE | `/:productId` | Удалить товар | deleteProduct() |

---

## Примеры использования

### Создание товара

```typescript
const command = new CreateProductCommand({
  sellerId: '507f...',
  productName: 'Яблоко Гала',
  category: ProductCategory.FRUITS,
  price: 250,
  measuringScale: ProductMeasuringScale.KG,
  stepRate: ProductStepRate.STEP_0_5,  // Продается по 0.5кг
  aboutProduct: 'Свежие яблоки из Краснодара',
  origin: 'Россия, Краснодар',
  cardImageFile: req.file
});

const product = await productPort.createProduct(command);
console.log(product.productId);
console.log(product.totalStockQuantity); // 0 (пока не прикреплен к магазинам)
```

---

### Получение товаров с ShopProduct

```typescript
const query = new GetProductQuery(
  productId,
  {
    populateShopProducts: true  // Получить все ShopProduct
  }
);

const product = await productPort.getProduct(query);
console.log(product.shopProducts); // Массив ShopProduct
```

---

## Заключение

**Product Module** - мастер-каталог товаров продавца.

**Ключевые особенности:**
- ✅ Абстрактный товар (шаблон)
- ✅ Гибкая система единиц измерения и шагов
- ✅ Категоризация товаров
- ✅ Виртуальная связь с ShopProduct
- ✅ Агрегированная статистика

**Связанные модули:**
- **Seller** - владелец товаров
- **ShopProduct** - конкретные товары в магазинах

**Двухуровневая модель:**
```
Product (мастер-каталог)
  └── ShopProduct (товары в магазинах)
       ├── Shop A: в наличии 50кг
       ├── Shop B: в наличии 30кг
       └── Shop C: нет в наличии
```

**Важно:** Product сам по себе не доступен для заказа. Только через ShopProduct.

---

> **Примечание:** При изменении схемы или портов обновлять эту документацию.
