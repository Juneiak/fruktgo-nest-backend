/**
 * Статус списания
 */
export enum WriteOffStatus {
  /** Черновик */
  DRAFT = 'DRAFT',
  /** Подтверждено — товар списан */
  CONFIRMED = 'CONFIRMED',
  /** Отменено */
  CANCELLED = 'CANCELLED',
}

/**
 * Причина списания (реэкспорт из batch для удобства)
 */
export { WriteOffReason } from '../../batch/batch.enums';
