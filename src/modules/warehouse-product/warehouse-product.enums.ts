/**
 * Статус товара на складе
 */
export enum WarehouseProductStatus {
  /** Активен - доступен для перемещений */
  ACTIVE = 'ACTIVE',
  
  /** Приостановлен */
  SUSPENDED = 'SUSPENDED',
  
  /** Архив */
  ARCHIVED = 'ARCHIVED',
}
