import { ExpirationAlertLevel } from '../batch/batch.enums';
import { LocationType } from '../batch-location/batch-location.enums';

/**
 * Информация о партии для алертов
 */
export interface BatchAlertInfo {
  batchId: string;
  batchNumber?: string;
  batchLocationId: string;
  productId: string;
  productName?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  alertLevel: ExpirationAlertLevel;
  locationType: LocationType;
  locationId: string;
  locationName?: string;
  purchasePrice?: number;
  totalValue?: number;
}

/**
 * Сводка по алертам для локации
 */
export interface LocationAlertSummary {
  locationType: LocationType;
  locationId: string;
  locationName?: string;
  criticalCount: number;
  warningCount: number;
  expiredCount: number;
  criticalValue: number;
  warningValue: number;
  expiredValue: number;
}

/**
 * Ежедневный отчёт по истечениям
 */
export interface ExpirationReport {
  sellerId: string;
  generatedAt: Date;
  /** Истёкшие сегодня */
  expiredToday: BatchAlertInfo[];
  /** Истекают завтра */
  expiringTomorrow: BatchAlertInfo[];
  /** Истекают в течение 3 дней */
  criticalBatches: BatchAlertInfo[];
  /** Истекают в течение 7 дней */
  warningBatches: BatchAlertInfo[];
  /** Сводка по локациям */
  byLocation: LocationAlertSummary[];
  /** Общая стоимость под угрозой */
  totalValueAtRisk: number;
}

/**
 * Настройки алертов для продавца
 */
export interface AlertSettings {
  /** Включены ли алерты */
  enabled: boolean;
  /** Дней до WARNING */
  warningDays: number;
  /** Дней до CRITICAL */
  criticalDays: number;
  /** Автоблокировка истёкших */
  autoBlockExpired: boolean;
  /** Автосписание истёкших */
  autoWriteOffExpired: boolean;
  /** Дней после истечения для автосписания */
  autoWriteOffAfterDays: number;
  /** Telegram уведомления */
  telegramNotifications: boolean;
  /** Email уведомления */
  emailNotifications: boolean;
  /** Время ежедневного отчёта (часы, 0-23) */
  dailyReportHour: number;
}

/**
 * Дефолтные настройки
 */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  warningDays: 7,
  criticalDays: 3,
  autoBlockExpired: true,
  autoWriteOffExpired: false,
  autoWriteOffAfterDays: 1,
  telegramNotifications: true,
  emailNotifications: false,
  dailyReportHour: 8,
};
