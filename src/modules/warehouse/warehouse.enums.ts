/**
 * Статус склада
 */
export enum WarehouseStatus {
  /** Активен - принимает товар */
  ACTIVE = 'ACTIVE',
  
  /** Приостановлен - временно не работает */
  SUSPENDED = 'SUSPENDED',
  
  /** Закрыт - не используется */
  CLOSED = 'CLOSED',
}
