import { Types } from 'mongoose';
import { OrderEventType } from './order.enums';
import { OrderEvent, OrderEventActor } from './order.schema';

/**
 * Создает новое событие заказа
 */
export function createOrderEvent(
  type: OrderEventType,
  actor?: OrderEventActor,
  data?: Record<string, any>,
  metadata?: Record<string, any>
): OrderEvent {
  return {
    _id: new Types.ObjectId(),
    type,
    timestamp: new Date(),
    actor,
    data,
    metadata,
  };
}

/**
 * Проверяет, было ли событие определенного типа
 */
export function hasEvent(
  events: OrderEvent[],
  type: OrderEventType
): boolean {
  return events.some(e => e.type === type);
}

/**
 * Создает событие отмены заказа
 */
export function createCancelEvent(
  reason: string,
  comment?: string,
  actor?: OrderEventActor
): OrderEvent {
  return createOrderEvent(
    OrderEventType.CANCELLED,
    actor,
    { reason, comment }
  );
}

/**
 * Создает событие отклонения заказа
 */
export function createDeclineEvent(
  reason: string,
  comment?: string,
  actor?: OrderEventActor
): OrderEvent {
  return createOrderEvent(
    OrderEventType.DECLINED,
    actor,
    { reason, comment }
  );
}

/**
 * Создает событие установки рейтинга
 */
export function createRatingEvent(
  rating: number,
  tags: string[],
  comment?: string,
  actor?: OrderEventActor
): OrderEvent {
  return createOrderEvent(
    OrderEventType.RATING_SET,
    actor,
    { rating, tags, comment }
  );
}
