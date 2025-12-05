/**
 * Статус приёмки
 */
export enum ReceivingStatus {
  /** Черновик — можно редактировать */
  DRAFT = 'DRAFT',
  /** Подтверждена — партии созданы, остатки обновлены */
  CONFIRMED = 'CONFIRMED',
  /** Отменена */
  CANCELLED = 'CANCELLED',
}

/**
 * Тип приёмки
 */
export enum ReceivingType {
  /** От поставщика */
  SUPPLIER = 'SUPPLIER',
  /** Возврат от курьера */
  DELIVERY_RETURN = 'DELIVERY_RETURN',
  /** Начальные остатки */
  INITIAL_STOCK = 'INITIAL_STOCK',
  /** Производство (homemade) */
  PRODUCTION = 'PRODUCTION',
}
