/**
 * Статус партии товара
 */
export enum ProductBatchStatus {
  /** Активна - можно продавать */
  ACTIVE = 'ACTIVE',
  /** Заблокирована - нельзя продавать (проверка качества) */
  BLOCKED = 'BLOCKED',
  /** Истёк срок - автоматически при достижении expirationDate */
  EXPIRED = 'EXPIRED',
  /** Полностью списана/продана */
  DEPLETED = 'DEPLETED',
}

/**
 * Уровень срочности по сроку годности
 */
export enum ExpirationAlertLevel {
  /** Нормально - более 7 дней до истечения */
  NORMAL = 'NORMAL',
  /** Внимание - 3-7 дней до истечения */
  WARNING = 'WARNING',
  /** Критично - менее 3 дней до истечения */
  CRITICAL = 'CRITICAL',
  /** Истёк */
  EXPIRED = 'EXPIRED',
}
