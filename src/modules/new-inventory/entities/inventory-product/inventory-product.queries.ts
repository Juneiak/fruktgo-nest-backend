import { Types } from 'mongoose';
import { ProductCategory, InventoryProductStatus, ShelfLifeType } from './inventory-product.enums';

/**
 * Получить продукт по ID
 */
export class GetProductByIdQuery {
  constructor(public readonly productId: Types.ObjectId | string) {}
}

/**
 * Получить продукт по SKU
 */
export class GetProductBySkuQuery {
  constructor(
    public readonly seller: Types.ObjectId | string,
    public readonly sku: string,
  ) {}
}

/**
 * Получить продукт по штрих-коду
 */
export class GetProductByBarcodeQuery {
  constructor(
    public readonly seller: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Получить продукты продавца
 */
export class GetSellerProductsQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      category?: ProductCategory;
      status?: InventoryProductStatus | InventoryProductStatus[];
      shelfLifeType?: ShelfLifeType;
      search?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Поиск продуктов
 */
export class SearchProductsQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      query: string;
      category?: ProductCategory;
      limit?: number;
    },
  ) {}
}

/**
 * Получить продукты по категории
 */
export class GetProductsByCategoryQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      category: ProductCategory;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить скоропортящиеся продукты
 */
export class GetPerishableProductsQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      maxShelfLifeDays?: number;
    },
  ) {}
}

/**
 * Получить продукты с усушкой
 */
export class GetShrinkableProductsQuery {
  constructor(public readonly seller: Types.ObjectId | string) {}
}

/**
 * Получить продукты, требующие охлаждения
 */
export class GetRefrigeratedProductsQuery {
  constructor(public readonly seller: Types.ObjectId | string) {}
}

/**
 * Получить продукты по мастер-продукту
 */
export class GetProductsByMasterQuery {
  constructor(public readonly masterProductId: Types.ObjectId | string) {}
}

/**
 * Подсчёт продуктов
 */
export class CountProductsQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      category?: ProductCategory;
      status?: InventoryProductStatus;
      isActive?: boolean;
    },
  ) {}
}

/**
 * Проверить уникальность SKU
 */
export class CheckSkuUniqueQuery {
  constructor(
    public readonly seller: Types.ObjectId | string,
    public readonly sku: string,
    public readonly excludeProductId?: Types.ObjectId | string,
  ) {}
}

/**
 * Проверить уникальность штрих-кода
 */
export class CheckBarcodeUniqueQuery {
  constructor(
    public readonly seller: Types.ObjectId | string,
    public readonly barcode: string,
    public readonly excludeProductId?: Types.ObjectId | string,
  ) {}
}
