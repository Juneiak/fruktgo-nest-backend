import { Types } from 'mongoose';
import { DiscountType, DiscountReason } from '../entities/storefront/storefront.enums';
import { PurchasePriceStrategy } from '../entities/product-template/product-template.enums';
import { ExpirationDiscountRule, BulkDiscount } from './pricing.types';

/**
 * Обновить закупочную цену из новой партии
 */
export class UpdatePurchasePriceFromBatchCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      batchPurchasePrice: number;
      batchQuantity: number;
      strategy: PurchasePriceStrategy;
    },
  ) {}
}

/**
 * Применить скидку к товару
 */
export class ApplyDiscountCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
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
 * Удалить скидку
 */
export class RemoveDiscountCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      reason: DiscountReason;
    },
  ) {}
}

/**
 * Автоматически применить скидки по сроку годности
 */
export class AutoApplyExpirationDiscountsCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      rules?: ExpirationDiscountRule[];
    },
  ) {}
}

/**
 * Обновить цены товара
 */
export class UpdateProductPricesCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      onlinePrice?: number;
      offlinePrice?: number;
    },
  ) {}
}

/**
 * Установить оптовые скидки для товара
 */
export class SetBulkDiscountsCommand {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      bulkDiscounts: BulkDiscount[];
    },
  ) {}
}

/**
 * Обновить конфигурацию ценообразования продавца
 */
export class UpdatePricingConfigCommand {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      minMarginPercent?: number;
      expirationDiscountRules?: ExpirationDiscountRule[];
      bulkDiscounts?: BulkDiscount[];
      autoApplyExpirationDiscounts?: boolean;
      defaultPurchasePriceStrategy?: PurchasePriceStrategy;
    },
  ) {}
}

/**
 * Пересчитать все цены витрины
 */
export class RecalculateStorefrontPricesCommand {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
  ) {}
}
