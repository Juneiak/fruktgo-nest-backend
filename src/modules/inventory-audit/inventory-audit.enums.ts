/**
 * Статус документа инвентаризации
 */
export enum InventoryAuditStatus {
  /** Черновик - можно редактировать список товаров */
  DRAFT = 'DRAFT',
  
  /** В процессе - идёт подсчёт */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Завершено - результаты применены к остаткам */
  COMPLETED = 'COMPLETED',
  
  /** Отменено */
  CANCELLED = 'CANCELLED',
}

/**
 * Тип инвентаризации
 */
export enum InventoryAuditType {
  /** Полная инвентаризация всех товаров магазина */
  FULL = 'FULL',
  
  /** Выборочная инвентаризация */
  PARTIAL = 'PARTIAL',
  
  /** Контрольная проверка (после полной) */
  CONTROL = 'CONTROL',
}
