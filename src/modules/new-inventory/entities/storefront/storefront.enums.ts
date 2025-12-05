/**
 * Статус витрины
 */
export enum StorefrontStatus {
  /** Активна — товары доступны для продажи */
  ACTIVE = 'ACTIVE',
  /** Приостановлена — товары не продаются */
  PAUSED = 'PAUSED',
  /** Закрыта */
  CLOSED = 'CLOSED',
}

/**
 * Статус товара на витрине
 */
export enum StorefrontProductStatus {
  /** Активен — доступен для продажи */
  ACTIVE = 'ACTIVE',
  /** Скрыт — не отображается клиентам */
  HIDDEN = 'HIDDEN',
  /** Нет в наличии */
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  /** Заблокирован */
  BLOCKED = 'BLOCKED',
}

/**
 * Тип скидки
 */
export enum DiscountType {
  /** Фиксированная сумма */
  FIXED = 'FIXED',
  /** Процент от цены */
  PERCENT = 'PERCENT',
}

/**
 * Причина скидки
 */
export enum DiscountReason {
  /** Скидка по сроку годности */
  EXPIRATION = 'EXPIRATION',
  /** Промо-акция */
  PROMO = 'PROMO',
  /** Ручная скидка */
  MANUAL = 'MANUAL',
  /** Оптовая скидка */
  BULK = 'BULK',
  /** Скидка постоянного клиента */
  LOYALTY = 'LOYALTY',
}
