# Этап 1.3: CATALOG & STOREFRONT

## Краткое содержание

CATALOG — мастер-данные товаров (категории, продукты). STOREFRONT — витрина магазина (ShopProduct с ценами, листинги, поиск).

## Предполагаемый результат

- Категории с иерархией работают
- Мастер-товары (Product) создаются
- ShopProduct привязывает товар к магазину с ценой
- MongoDB Atlas Search для базового поиска
- Фильтрация по city работает

---

# CATALOG

## 1. Структура модуля

```
src/modules/catalog/
├── index.ts
├── catalog.module.ts
├── category/
│   ├── category.port.ts
│   ├── category.service.ts
│   ├── category.schema.ts
│   ├── category.commands.ts
│   └── category.queries.ts
└── product/
    ├── product.port.ts
    ├── product.service.ts
    ├── product.schema.ts
    ├── product.commands.ts
    ├── product.queries.ts
    └── product.enums.ts
```

---

## 2. Category Schema

```typescript
// src/modules/catalog/category/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  collection: 'categories',
  toJSON: { virtuals: true },
})
export class Category {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string; // URL-friendly: "frukty-i-ovoschi"

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: Types.ObjectId, ref: Category.name, index: true })
  parentId?: Types.ObjectId; // null = корневая категория

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  path: string[]; // ["root-id", "parent-id", "this-id"] для быстрого поиска

  @Prop({ type: Number, default: 0 })
  level: number; // 0 = корневая, 1 = первый уровень и т.д.

  // Виртуальные
  categoryId: string;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.virtual('categoryId').get(function () {
  return this._id.toHexString();
});

// Индексы
CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ path: 1 });
CategorySchema.index({ isActive: 1 });
```

---

## 3. Category Port

```typescript
// src/modules/catalog/category/category.port.ts
import * as CategoryCommands from './category.commands';
import * as CategoryQueries from './category.queries';
import { Category } from './category.schema';

export const CATEGORY_PORT = Symbol('CATEGORY_PORT');

export interface CategoryPort {
  // Commands
  create(command: CategoryCommands.CreateCommand): Promise<Category>;
  update(command: CategoryCommands.UpdateCommand): Promise<Category>;
  delete(command: CategoryCommands.DeleteCommand): Promise<void>;
  reorder(command: CategoryCommands.ReorderCommand): Promise<void>;

  // Queries
  getById(query: CategoryQueries.GetByIdQuery): Promise<Category>;
  getBySlug(query: CategoryQueries.GetBySlugQuery): Promise<Category>;
  getTree(query: CategoryQueries.GetTreeQuery): Promise<CategoryNode[]>;
  getChildren(query: CategoryQueries.GetChildrenQuery): Promise<Category[]>;
  getBreadcrumb(query: CategoryQueries.GetBreadcrumbQuery): Promise<Category[]>;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
```

---

## 4. Product Enums

```typescript
// src/modules/catalog/product/product.enums.ts

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum ProductUnit {
  PIECE = 'piece',   // штука
  KG = 'kg',         // килограмм
  GRAM = 'gram',     // грамм (для продажи дробными)
  LITER = 'liter',
  ML = 'ml',
}
```

---

## 5. Product Schema

```typescript
// src/modules/catalog/product/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductStatus, ProductUnit } from './product.enums';
import { Category } from '../category/category.schema';

@Schema({ _id: false })
export class ProductAttribute {
  @Prop({ type: String, required: true })
  name: string; // "Страна", "Сорт"

  @Prop({ type: String, required: true })
  value: string; // "Казахстан", "Голден"
}

export const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);

@Schema({
  timestamps: true,
  collection: 'products',
  toJSON: { virtuals: true },
})
export class Product {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: Category.name, required: true, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  categoryPath: string[]; // Денормализация для быстрого поиска

  @Prop({ type: [String], default: [] })
  images: string[]; // URL изображений

  @Prop({ type: String, enum: ProductUnit, default: ProductUnit.PIECE })
  unit: ProductUnit;

  @Prop({ type: Number, default: 1 })
  stepQuantity: number; // Шаг изменения количества (0.1 для весовых)

  @Prop({ type: [ProductAttributeSchema], default: [] })
  attributes: ProductAttribute[];

  @Prop({ type: String })
  barcode?: string; // EAN-13

  @Prop({ type: String })
  sku?: string; // Артикул производителя

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Prop({ type: Boolean, default: false })
  isWeighted: boolean; // Весовой товар (с tolerance)

  // SEO
  @Prop({ type: String })
  metaTitle?: string;

  @Prop({ type: String })
  metaDescription?: string;

  // Виртуальные
  productId: string;
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.virtual('productId').get(function () {
  return this._id.toHexString();
});

// Индексы
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ categoryPath: 1 });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ name: 'text', description: 'text' }); // Текстовый поиск
```

---

## 6. Product Port

```typescript
// src/modules/catalog/product/product.port.ts
import * as ProductCommands from './product.commands';
import * as ProductQueries from './product.queries';
import { Product } from './product.schema';
import { PaginatedResult, PaginationOptions } from 'src/common';

export const PRODUCT_PORT = Symbol('PRODUCT_PORT');

export interface ProductPort {
  // Commands
  create(command: ProductCommands.CreateCommand): Promise<Product>;
  update(command: ProductCommands.UpdateCommand): Promise<Product>;
  archive(command: ProductCommands.ArchiveCommand): Promise<Product>;
  activate(command: ProductCommands.ActivateCommand): Promise<Product>;

  // Queries
  getById(query: ProductQueries.GetByIdQuery): Promise<Product>;
  getBySlug(query: ProductQueries.GetBySlugQuery): Promise<Product>;
  getByCategory(query: ProductQueries.GetByCategoryQuery): Promise<PaginatedResult<Product>>;
  search(query: ProductQueries.SearchQuery): Promise<PaginatedResult<Product>>;
}
```

---

# STOREFRONT

## 1. Структура модуля

```
src/modules/storefront/
├── index.ts
├── storefront.module.ts
├── shop-product/
│   ├── shop-product.port.ts
│   ├── shop-product.service.ts
│   ├── shop-product.schema.ts
│   ├── shop-product.commands.ts
│   ├── shop-product.queries.ts
│   └── shop-product.enums.ts
└── search/
    ├── search.service.ts
    └── search.types.ts
```

---

## 2. ShopProduct Enums

```typescript
// src/modules/storefront/shop-product/shop-product.enums.ts

export enum ShopProductStatus {
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}
```

---

## 3. ShopProduct Schema

```typescript
// src/modules/storefront/shop-product/shop-product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { City } from 'src/common';
import { Shop } from 'src/modules/business';
import { Product } from 'src/modules/catalog';
import { ShopProductStatus } from './shop-product.enums';

@Schema({ _id: false })
export class LivePhoto {
  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: Date, required: true })
  takenAt: Date;
}

export const LivePhotoSchema = SchemaFactory.createForClass(LivePhoto);

@Schema({ _id: false })
export class ShopProductStatistics {
  @Prop({ type: Number, default: 0 })
  viewsCount: number;

  @Prop({ type: Number, default: 0 })
  ordersCount: number;

  @Prop({ type: Number, default: 0 })
  rating: number;

  @Prop({ type: Number, default: 0 })
  reviewsCount: number;
}

export const ShopProductStatisticsSchema = SchemaFactory.createForClass(ShopProductStatistics);

@Schema({
  timestamps: true,
  collection: 'shop_products',
  toJSON: { virtuals: true },
})
export class ShopProduct {
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true, index: true })
  shopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: true, index: true })
  productId: Types.ObjectId;

  // Денормализация для быстрого поиска
  @Prop({ type: String, enum: City, required: true, index: true })
  city: City;

  @Prop({ type: Types.ObjectId, index: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  categoryPath: string[];

  // Цена магазина
  @Prop({ type: Number, required: true })
  price: number; // копейки

  @Prop({ type: Number })
  oldPrice?: number; // копейки, для показа скидки

  @Prop({ type: Number, default: 0 })
  discountPercent: number;

  // Наличие (синхронизация из INVENTORY)
  @Prop({ type: Number, default: 0 })
  stockQuantity: number;

  @Prop({ type: String, enum: ShopProductStatus, default: ShopProductStatus.ACTIVE })
  status: ShopProductStatus;

  // Живые фото
  @Prop({ type: [LivePhotoSchema], default: [] })
  livePhotos: LivePhoto[];

  // Кастомное описание магазина
  @Prop({ type: String })
  customDescription?: string;

  @Prop({ type: ShopProductStatisticsSchema, default: () => ({}) })
  statistics: ShopProductStatistics;

  // Виртуальные
  shopProductId: string;
}

export type ShopProductDocument = ShopProduct & Document;
export const ShopProductSchema = SchemaFactory.createForClass(ShopProduct);

ShopProductSchema.virtual('shopProductId').get(function () {
  return this._id.toHexString();
});

// Индексы
ShopProductSchema.index({ shopId: 1, productId: 1 }, { unique: true });
ShopProductSchema.index({ city: 1, categoryId: 1, status: 1 });
ShopProductSchema.index({ city: 1, status: 1, price: 1 });
ShopProductSchema.index({ city: 1, status: 1, 'statistics.ordersCount': -1 }); // Популярные

// Текстовый индекс (для Atlas Search лучше использовать отдельный индекс)
// ShopProductSchema.index({ 'product.name': 'text' });
```

---

## 4. ShopProduct Port

```typescript
// src/modules/storefront/shop-product/shop-product.port.ts
import * as ShopProductCommands from './shop-product.commands';
import * as ShopProductQueries from './shop-product.queries';
import { ShopProduct } from './shop-product.schema';
import { PaginatedResult, City } from 'src/common';

export const SHOP_PRODUCT_PORT = Symbol('SHOP_PRODUCT_PORT');

export interface ShopProductPort {
  // Commands
  create(command: ShopProductCommands.CreateCommand): Promise<ShopProduct>;
  update(command: ShopProductCommands.UpdateCommand): Promise<ShopProduct>;
  updatePrice(command: ShopProductCommands.UpdatePriceCommand): Promise<ShopProduct>;
  updateStock(command: ShopProductCommands.UpdateStockCommand): Promise<ShopProduct>;
  addLivePhoto(command: ShopProductCommands.AddLivePhotoCommand): Promise<ShopProduct>;
  hide(command: ShopProductCommands.HideCommand): Promise<ShopProduct>;
  show(command: ShopProductCommands.ShowCommand): Promise<ShopProduct>;
  delete(command: ShopProductCommands.DeleteCommand): Promise<void>;

  // Queries
  getById(query: ShopProductQueries.GetByIdQuery): Promise<ShopProduct>;
  getByShopId(query: ShopProductQueries.GetByShopIdQuery): Promise<PaginatedResult<ShopProduct>>;
  getByCity(query: ShopProductQueries.GetByCityQuery): Promise<PaginatedResult<ShopProduct>>;
  getByCategory(query: ShopProductQueries.GetByCategoryQuery): Promise<PaginatedResult<ShopProduct>>;
  search(query: ShopProductQueries.SearchQuery): Promise<PaginatedResult<ShopProduct>>;
}
```

---

## 5. ShopProduct Commands

```typescript
// src/modules/storefront/shop-product/shop-product.commands.ts
import { CommonCommandOptions, City } from 'src/common';

export class CreateCommand {
  constructor(
    public readonly data: {
      shopId: string;
      productId: string;
      city: City;
      categoryId: string;
      categoryPath: string[];
      price: number;
      oldPrice?: number;
    },
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdatePriceCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly price: number,
    public readonly oldPrice?: number,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class UpdateStockCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly stockQuantity: number,
    public readonly options?: CommonCommandOptions,
  ) {}
}

export class AddLivePhotoCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly photoUrl: string,
    public readonly takenAt: Date,
    public readonly options?: CommonCommandOptions,
  ) {}
}

// ... остальные команды
```

---

## 6. Search Queries

```typescript
// src/modules/storefront/shop-product/shop-product.queries.ts
import { CommonQueryOptions, City, PaginationOptions } from 'src/common';

export class GetByIdQuery {
  constructor(
    public readonly shopProductId: string,
    public readonly options?: CommonQueryOptions,
  ) {}
}

export class GetByCityQuery {
  constructor(
    public readonly city: City,
    public readonly filters?: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
    },
    public readonly sort?: 'price_asc' | 'price_desc' | 'popular' | 'new',
    public readonly pagination?: PaginationOptions,
    public readonly options?: CommonQueryOptions,
  ) {}
}

export class SearchQuery {
  constructor(
    public readonly city: City,
    public readonly query: string,
    public readonly filters?: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
    },
    public readonly pagination?: PaginationOptions,
    public readonly options?: CommonQueryOptions,
  ) {}
}
```

---

## 7. Search Service (Atlas Search)

```typescript
// src/modules/storefront/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopProduct, ShopProductDocument } from '../shop-product/shop-product.schema';
import { City, PaginatedResult, paginate } from 'src/common';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(ShopProduct.name) private shopProductModel: Model<ShopProductDocument>,
  ) {}

  async search(
    city: City,
    query: string,
    filters?: { categoryId?: string; minPrice?: number; maxPrice?: number },
    pagination = { page: 1, limit: 20 },
  ): Promise<PaginatedResult<ShopProduct>> {
    // MongoDB Atlas Search aggregation
    const pipeline: any[] = [
      {
        $search: {
          index: 'shop_products_search', // Нужно создать в Atlas
          text: {
            query,
            path: ['productName', 'customDescription'],
            fuzzy: { maxEdits: 1 },
          },
        },
      },
      {
        $match: {
          city,
          status: 'active',
          ...(filters?.categoryId && { categoryId: filters.categoryId }),
          ...(filters?.minPrice && { price: { $gte: filters.minPrice } }),
          ...(filters?.maxPrice && { price: { $lte: filters.maxPrice } }),
        },
      },
      { $skip: (pagination.page - 1) * pagination.limit },
      { $limit: pagination.limit },
    ];

    const [items, countResult] = await Promise.all([
      this.shopProductModel.aggregate(pipeline),
      this.shopProductModel.aggregate([
        ...pipeline.slice(0, 2), // $search + $match
        { $count: 'total' },
      ]),
    ]);

    const total = countResult[0]?.total || 0;
    return paginate(items, total, pagination);
  }
}
```

---

## 8. Взаимодействие с другими модулями

| Модуль | Направление | Описание |
|--------|-------------|----------|
| CATALOG | ← | Получение Product для создания ShopProduct |
| BUSINESS | ← | Привязка к Shop, получение city |
| INVENTORY | ← | Синхронизация stockQuantity |
| ORDERS | → | Получение товаров для корзины/заказа |
| MEDIA | ← | Загрузка livePhotos |

---

## 9. Endpoints

### Public (витрина)

```
GET /storefront/products?city=...&category=...&sort=...
GET /storefront/products/:id
GET /storefront/products/search?city=...&q=...
GET /storefront/shops/:shopId/products
GET /storefront/categories
GET /storefront/categories/:id
```

### Seller (управление)

```
POST   /seller/shops/:shopId/products
PATCH  /seller/shops/:shopId/products/:id
PATCH  /seller/shops/:shopId/products/:id/price
DELETE /seller/shops/:shopId/products/:id
POST   /seller/shops/:shopId/products/:id/live-photo
```

---

## Чеклист готовности

- [ ] Категории с иерархией работают
- [ ] Product CRUD работает
- [ ] ShopProduct привязывается к магазину
- [ ] city фильтрация работает
- [ ] Поиск через Atlas Search работает
- [ ] LivePhotos загружаются
- [ ] stockQuantity обновляется из INVENTORY
