import { Types } from 'mongoose';
import {
  StorefrontStatus,
  StorefrontProductStatus,
  DiscountType,
  DiscountReason,
} from './storefront.enums';

/**
 * Создать витрину
 */
export class CreateStorefrontCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      shop: Types.ObjectId | string;
      shopName: string;
    },
  ) {}
}

/**
 * Добавить товар на витрину
 */
export class AddProductCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly data: {
      product: Types.ObjectId | string;
      productTemplate?: Types.ObjectId | string;
      productName: string;
      category?: Types.ObjectId | string;
      pricing: {
        onlinePrice: number;
        offlinePrice: number;
        purchasePrice?: number;
      };
    },
  ) {}
}

/**
 * Обновить ценообразование товара
 */
export class UpdateProductPricingCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      onlinePrice?: number;
      offlinePrice?: number;
      purchasePrice?: number;
    },
  ) {}
}

/**
 * Обновить видимость товара
 */
export class UpdateProductVisibilityCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly isVisible: boolean,
  ) {}
}

/**
 * Изменить статус товара
 */
export class UpdateProductStatusCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly status: StorefrontProductStatus,
  ) {}
}

/**
 * Применить скидку к товару
 */
export class ApplyDiscountCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      type: DiscountType;
      value: number;
      reason: DiscountReason;
      startDate?: Date;
      endDate?: Date;
      description?: string;
      appliedBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Удалить скидку с товара
 */
export class RemoveDiscountCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly reason: DiscountReason,
  ) {}
}

/**
 * Удалить все скидки с товара
 */
export class ClearDiscountsCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
  ) {}
}

/**
 * Обновить остатки товара (синхронизация из BatchLocation)
 */
export class SyncProductStockCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      stockQuantity: number;
      reservedQuantity: number;
      nearestExpirationDate?: Date;
      averageFreshness?: number;
    },
  ) {}
}

/**
 * Удалить товар с витрины
 */
export class RemoveProductCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
  ) {}
}

/**
 * Изменить статус витрины
 */
export class UpdateStorefrontStatusCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly status: StorefrontStatus,
  ) {}
}
