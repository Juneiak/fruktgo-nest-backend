/**
 * Статус консолидации
 */
export enum ConsolidationStatus {
  /** Ожидает выполнения */
  PENDING = 'PENDING',
  /** Выполняется */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Завершена успешно */
  COMPLETED = 'COMPLETED',
  /** Отменена */
  CANCELLED = 'CANCELLED',
  /** Ошибка */
  FAILED = 'FAILED',
}

/**
 * Тип консолидации
 */
export enum ConsolidationType {
  /** Автоматическая (по cron или триггеру) */
  AUTO = 'AUTO',
  /** При инвентаризации */
  AUDIT = 'AUDIT',
  /** Ручная (по запросу менеджера) */
  MANUAL = 'MANUAL',
}
