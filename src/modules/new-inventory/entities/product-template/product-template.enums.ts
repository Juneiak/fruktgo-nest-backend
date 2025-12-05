/**
 * Статус шаблона товара
 */
export enum ProductTemplateStatus {
  /** Активный — можно создавать партии и продавать */
  ACTIVE = 'ACTIVE',
  /** Неактивный — нельзя создавать новые партии */
  INACTIVE = 'INACTIVE',
  /** Архивный — полностью скрыт */
  ARCHIVED = 'ARCHIVED',
}

/**
 * Стратегия расчёта закупочной цены для наценки
 */
export enum PurchasePriceStrategy {
  /** Последняя закупочная цена */
  LAST = 'LAST',
  /** Средневзвешенная по партиям */
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
  /** Средняя по FIFO партиям (в наличии) */
  FIFO_AVERAGE = 'FIFO_AVERAGE',
}

// ProductUnit экспортируется из inventory-product
