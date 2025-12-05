/**
 * Статус партии
 */
export enum BatchStatus {
  /** Активна, можно продавать */
  ACTIVE = 'ACTIVE',
  /** Заблокирована (возврат, проверка качества, спор с поставщиком) */
  BLOCKED = 'BLOCKED',
  /** В споре с поставщиком — заблокирована для продажи */
  DISPUTE = 'DISPUTE',
  /** Срок годности истёк */
  EXPIRED = 'EXPIRED',
  /** Полностью израсходована */
  DEPLETED = 'DEPLETED',
}

/**
 * Уровень алерта по сроку годности
 */
export enum ExpirationAlertLevel {
  /** Более 7 дней — всё хорошо */
  NORMAL = 'NORMAL',
  /** 3-7 дней — внимание */
  WARNING = 'WARNING',
  /** Менее 3 дней — критично */
  CRITICAL = 'CRITICAL',
  /** Срок истёк */
  EXPIRED = 'EXPIRED',
}

/**
 * Причины списания
 */
export enum WriteOffReason {
  /** Истёк срок годности */
  EXPIRED = 'EXPIRED',
  /** Повреждён (помят, разбит) */
  DAMAGED = 'DAMAGED',
  /** Испортился раньше срока */
  SPOILED = 'SPOILED',
  /** Кража */
  THEFT = 'THEFT',
  /** Проблемы с качеством */
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  /** Недостача при инвентаризации */
  INVENTORY_DIFF = 'INVENTORY_DIFF',
  /** На производство (для homemade товаров) */
  FOR_PRODUCTION = 'FOR_PRODUCTION',
  /** Усушка (автоматическое списание веса) */
  SHRINKAGE = 'SHRINKAGE',
  /** Образец/дегустация */
  SAMPLE = 'SAMPLE',
  /** Прочее */
  OTHER = 'OTHER',
}

/**
 * Причина блокировки партии
 */
export enum BatchBlockReason {
  /** Возврат от покупателя — проверка качества */
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  /** Спор с поставщиком */
  SUPPLIER_DISPUTE = 'SUPPLIER_DISPUTE',
  /** Проверка качества */
  QUALITY_CHECK = 'QUALITY_CHECK',
  /** Отзыв продукции */
  PRODUCT_RECALL = 'PRODUCT_RECALL',
  /** Ручная блокировка */
  MANUAL = 'MANUAL',
}

/**
 * Причина ручной корректировки свежести
 */
export enum FreshnessAdjustmentReason {
  /** Визуальная оценка — товар выглядит лучше/хуже */
  VISUAL_INSPECTION = 'VISUAL_INSPECTION',
  /** Несоответствие условиям хранения */
  STORAGE_CONDITIONS = 'STORAGE_CONDITIONS',
  /** Ошибка при приёмке */
  RECEIVING_ERROR = 'RECEIVING_ERROR',
  /** Инвентаризация — фактическое состояние отличается */
  INVENTORY_AUDIT = 'INVENTORY_AUDIT',
  /** Жалоба покупателя */
  CUSTOMER_COMPLAINT = 'CUSTOMER_COMPLAINT',
  /** Прочее */
  OTHER = 'OTHER',
}
