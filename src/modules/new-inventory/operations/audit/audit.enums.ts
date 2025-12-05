/**
 * Тип инвентаризации
 */
export enum AuditType {
  /** Полная — все товары в локации */
  FULL = 'FULL',
  /** Частичная — выбранные категории/товары */
  PARTIAL = 'PARTIAL',
  /** Контрольная — выборочная проверка */
  CONTROL = 'CONTROL',
  /** Экспресс — только критичные товары */
  EXPRESS = 'EXPRESS',
}

/**
 * Статус инвентаризации
 */
export enum AuditStatus {
  /** Черновик — подготовка */
  DRAFT = 'DRAFT',
  /** В процессе — идёт подсчёт */
  IN_PROGRESS = 'IN_PROGRESS',
  /** Завершена — подсчёт окончен */
  COMPLETED = 'COMPLETED',
  /** Применено — корректировки внесены */
  APPLIED = 'APPLIED',
  /** Отменена */
  CANCELLED = 'CANCELLED',
}

/**
 * Статус позиции инвентаризации
 */
export enum AuditItemStatus {
  /** Ожидает подсчёта */
  PENDING = 'PENDING',
  /** Подсчитано */
  COUNTED = 'COUNTED',
  /** Пропущено */
  SKIPPED = 'SKIPPED',
}

/**
 * Тип расхождения
 */
export enum DiscrepancyType {
  /** Нет расхождения */
  NONE = 'NONE',
  /** Излишек */
  SURPLUS = 'SURPLUS',
  /** Недостача */
  SHORTAGE = 'SHORTAGE',
}
