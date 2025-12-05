// PurchasePriceStrategy экспортируется из entities/product-template/product-template.enums.ts
// DiscountType и DiscountReason экспортируются из entities/storefront/storefront.enums.ts

/**
 * Канал продаж
 */
export enum SalesChannel {
  /** Онлайн (приложение, сайт) */
  ONLINE = 'ONLINE',
  /** Офлайн (касса в магазине) */
  OFFLINE = 'OFFLINE',
}

/**
 * Статус проверки маржинальности
 */
export enum MarginStatus {
  /** Прибыльно */
  PROFITABLE = 'PROFITABLE',
  /** Низкая маржа (но положительная) */
  LOW_MARGIN = 'LOW_MARGIN',
  /** Убыточно */
  UNPROFITABLE = 'UNPROFITABLE',
}
