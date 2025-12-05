import { Types } from 'mongoose';
import { SalesChannel } from './pricing.enums';

/**
 * Рассчитать финальную цену
 */
export class CalculateFinalPriceQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      quantity: number;
      channel: SalesChannel;
      promoCode?: string;
    },
  ) {}
}

/**
 * Рассчитать маржинальность товара
 */
export class CalculateMarginQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      channel: SalesChannel;
    },
  ) {}
}

/**
 * Проверить прибыльность товара
 */
export class CheckProfitabilityQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      minMarginPercent?: number;
    },
  ) {}
}

/**
 * Получить товары с низкой маржой
 */
export class GetLowMarginProductsQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      marginThreshold: number;
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
 * Получить товары, требующие скидку по сроку
 */
export class GetProductsRequiringExpirationDiscountQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      rules?: Array<{ daysUntilExpiration: number; discountPercent: number }>;
    },
  ) {}
}

/**
 * Получить конфигурацию ценообразования продавца
 */
export class GetPricingConfigQuery {
  constructor(public readonly sellerId: Types.ObjectId | string) {}
}

/**
 * Получить историю изменения цен товара
 */
export class GetPriceHistoryQuery {
  constructor(
    public readonly data: {
      storefrontId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ) {}
}

/**
 * Симуляция цены (без сохранения)
 */
export class SimulatePriceQuery {
  constructor(
    public readonly data: {
      basePrice: number;
      purchasePrice: number;
      quantity: number;
      channel: SalesChannel;
      discounts?: Array<{
        type: 'FIXED' | 'PERCENT';
        value: number;
      }>;
    },
  ) {}
}
