import { OrderStatus, OrderEventType } from './order.enums';
import { OrderEvent } from './order.schema';

/**
 * Тип для результата валидации перехода статуса
 */
export interface StatusTransitionResult {
  isValid: boolean;
  error?: string;
}

/**
 * Тип для истории изменений статуса (устаревший, используйте события)
 * @deprecated Используйте OrderEvent вместо этого
 */
export interface StatusHistoryEntry {
  from: OrderStatus;
  to: OrderStatus;
  changedAt: Date;
  changedBy?: string;
  reason?: string;
}

/**
 * Тип для фильтра событий
 */
export interface EventsFilter {
  types?: OrderEventType[];
  actorIds?: string[];
  actorTypes?: ('customer' | 'employee' | 'system')[];
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Тип для метаданных заказа
 */
export interface OrderMetadata {
  version: number; // Версия схемы заказа
  source: 'app' | 'web' | 'telegram' | 'api'; // Источник заказа
  deviceInfo?: string;
  ipAddress?: string;
}

/**
 * Тип для вычисляемых полей заказа
 */
export interface OrderComputedFields {
  totalItems: number; // Общее количество товаров
  isRated: boolean; // Был ли оставлен отзыв
  processingTime?: number; // Время обработки в минутах (от orderedAt до deliveredAt)
  hasIssues: boolean; // Есть ли проблемы (расхождения в количестве и т.д.)
}

/**
 * Тип для фильтров запросов заказов
 */
export interface OrderFilters {
  customerId?: string;
  shopId?: string;
  employeeId?: string;
  shiftId?: string;
  status?: OrderStatus | OrderStatus[];
  startDate?: Date;
  endDate?: Date;
  minSum?: number;
  maxSum?: number;
  hasRating?: boolean;
  hasIssues?: boolean;
}

/**
 * Тип для статистики заказов
 */
export interface OrderStatistics {
  total: number;
  byStatus: Record<OrderStatus, number>;
  totalRevenue: number;
  averageOrderValue: number;
  averageProcessingTime: number;
  cancelRate: number;
  declineRate: number;
  returnRate: number;
}
