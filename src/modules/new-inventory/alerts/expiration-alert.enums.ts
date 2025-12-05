// ExpirationAlertLevel экспортируется из batch/batch.enums.ts
// import { ExpirationAlertLevel } from '../batch/batch.enums';

/**
 * Тип действия по алерту
 */
export enum AlertActionType {
  /** Автоматическая скидка */
  AUTO_DISCOUNT = 'AUTO_DISCOUNT',
  /** Автоматическое списание */
  AUTO_WRITE_OFF = 'AUTO_WRITE_OFF',
  /** Блокировка продаж */
  BLOCK_SALES = 'BLOCK_SALES',
  /** Уведомление */
  NOTIFICATION = 'NOTIFICATION',
}
