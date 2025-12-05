import { Types } from 'mongoose';
import { StorefrontStatus, StorefrontProductStatus } from './storefront.enums';

/**
 * Получить витрину по ID
 */
export class GetStorefrontByIdQuery {
  constructor(public readonly storefrontId: Types.ObjectId | string) {}
}

/**
 * Получить витрину по магазину
 */
export class GetStorefrontByShopQuery {
  constructor(public readonly shopId: Types.ObjectId | string) {}
}

/**
 * Получить витрины продавца
 */
export class GetStorefrontsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: StorefrontStatus | StorefrontStatus[];
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить товары витрины
 */
export class GetStorefrontProductsQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      status?: StorefrontProductStatus | StorefrontProductStatus[];
      category?: Types.ObjectId | string;
      isVisible?: boolean;
      hasDiscount?: boolean;
      inStock?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить товар по ID продукта
 */
export class GetStorefrontProductQuery {
  constructor(
    public readonly storefrontId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
  ) {}
}

/**
 * Рассчитать финальную цену
 */
export class CalculateFinalPriceQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      quantity: number;
      channel: 'online' | 'offline';
    },
  ) {}
}

/**
 * Получить товары с истекающими скидками
 */
export class GetProductsWithExpiringDiscountsQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      withinDays: number;
    },
  ) {}
}

/**
 * Статистика витрины
 */
export class GetStorefrontStatisticsQuery {
  constructor(public readonly storefrontId: Types.ObjectId | string) {}
}
