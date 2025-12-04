/**
 * Тип локации для BatchStock
 */
export enum BatchStockLocationType {
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
}

/**
 * Статус остатка партии
 */
export enum BatchStockStatus {
  /** Активен - можно использовать */
  ACTIVE = 'ACTIVE',
  /** Заблокирован (партия заблокирована) */
  BLOCKED = 'BLOCKED',
  /** Израсходован полностью */
  DEPLETED = 'DEPLETED',
}
