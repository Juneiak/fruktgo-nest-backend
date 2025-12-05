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

/**
 * Единица измерения
 */
export enum ProductUnit {
  /** Килограмм */
  KG = 'KG',
  /** Штука */
  PCS = 'PCS',
  /** Грамм */
  G = 'G',
  /** Литр */
  L = 'L',
  /** Миллилитр */
  ML = 'ML',
  /** Упаковка */
  PACK = 'PACK',
}
