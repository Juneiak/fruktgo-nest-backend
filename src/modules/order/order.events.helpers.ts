import { Types } from 'mongoose';
import { OrderEventType, OrderStatus } from './order.enums';
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
 * Маппинг события на изменение статуса
 */
export const EventToStatusMap: Partial<Record<OrderEventType, OrderStatus>> = {
  [OrderEventType.CREATED]: OrderStatus.PENDING,
  [OrderEventType.ASSEMBLY_STARTED]: OrderStatus.ASSEMBLING,
  [OrderEventType.ASSEMBLY_COMPLETED]: OrderStatus.AWAITING_COURIER,
  [OrderEventType.HANDED_TO_COURIER]: OrderStatus.IN_DELIVERY,
  [OrderEventType.DELIVERED]: OrderStatus.DELIVERED,
  [OrderEventType.CANCELLED]: OrderStatus.CANCELLED,
  [OrderEventType.DECLINED]: OrderStatus.DECLINED,
  [OrderEventType.RETURNED]: OrderStatus.RETURNED,
};

/**
 * Возвращает последнее событие определенного типа
 */
export function getLastEvent(
  events: OrderEvent[],
  type: OrderEventType
): OrderEvent | null {
  const filtered = events.filter(e => e.type === type);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

/**
 * Возвращает все события определенного типа
 */
export function getEventsByType(
  events: OrderEvent[],
  type: OrderEventType
): OrderEvent[] {
  return events.filter(e => e.type === type);
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
 * Возвращает время последнего события определенного типа
 */
export function getEventTimestamp(
  events: OrderEvent[],
  type: OrderEventType
): Date | null {
  const event = getLastEvent(events, type);
  return event ? event.timestamp : null;
}

/**
 * Возвращает актора последнего события определенного типа
 */
export function getEventActor(
  events: OrderEvent[],
  type: OrderEventType
): OrderEventActor | null {
  const event = getLastEvent(events, type);
  return event?.actor || null;
}

/**
 * Возвращает данные последнего события определенного типа
 */
export function getEventData<T = any>(
  events: OrderEvent[],
  type: OrderEventType
): T | null {
  const event = getLastEvent(events, type);
  return event?.data as T || null;
}

/**
 * Вычисляет длительность между двумя событиями (в минутах)
 */
export function getDurationBetweenEvents(
  events: OrderEvent[],
  startEventType: OrderEventType,
  endEventType: OrderEventType
): number | null {
  const startEvent = getLastEvent(events, startEventType);
  const endEvent = getLastEvent(events, endEventType);

  if (!startEvent || !endEvent) return null;

  const diffMs = endEvent.timestamp.getTime() - startEvent.timestamp.getTime();
  return Math.round(diffMs / (1000 * 60)); // В минутах
}

/**
 * Возвращает хронологию событий (отсортированные по времени)
 */
export function getEventsTimeline(events: OrderEvent[]): OrderEvent[] {
  return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Возвращает события за определенный период
 */
export function getEventsBetween(
  events: OrderEvent[],
  startDate: Date,
  endDate: Date
): OrderEvent[] {
  return events.filter(
    e => e.timestamp >= startDate && e.timestamp <= endDate
  );
}

/**
 * Возвращает события определенного актора
 */
export function getEventsByActor(
  events: OrderEvent[],
  actorId: string | Types.ObjectId
): OrderEvent[] {
  const id = actorId.toString();
  return events.filter(e => e.actor?.id?.toString() === id);
}

/**
 * Создает событие изменения статуса
 */
export function createStatusChangeEvent(
  newStatus: OrderStatus,
  actor?: OrderEventActor,
  data?: Record<string, any>
): OrderEvent {
  return createOrderEvent(
    OrderEventType.STATUS_CHANGED,
    actor,
    { newStatus, ...data }
  );
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
 * Создает событие возврата заказа
 */
export function createReturnEvent(
  reason?: string,
  comment?: string,
  actor?: OrderEventActor
): OrderEvent {
  return createOrderEvent(
    OrderEventType.RETURNED,
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

/**
 * Проверяет, был ли заказ отменен или отклонен
 */
export function isOrderTerminated(events: OrderEvent[]): boolean {
  return hasEvent(events, OrderEventType.CANCELLED) ||
         hasEvent(events, OrderEventType.DECLINED) ||
         hasEvent(events, OrderEventType.RETURNED);
}

/**
 * Возвращает общее время обработки заказа (от создания до доставки)
 */
export function getTotalProcessingTime(events: OrderEvent[]): number | null {
  return getDurationBetweenEvents(
    events,
    OrderEventType.CREATED,
    OrderEventType.DELIVERED
  );
}

/**
 * Возвращает время сборки заказа
 */
export function getAssemblyTime(events: OrderEvent[]): number | null {
  return getDurationBetweenEvents(
    events,
    OrderEventType.ASSEMBLY_STARTED,
    OrderEventType.ASSEMBLY_COMPLETED
  );
}

/**
 * Возвращает время доставки
 */
export function getDeliveryTime(events: OrderEvent[]): number | null {
  return getDurationBetweenEvents(
    events,
    OrderEventType.DELIVERY_STARTED,
    OrderEventType.DELIVERED
  );
}

/**
 * Возвращает статистику по событиям
 */
export function getEventsStatistics(events: OrderEvent[]): {
  total: number;
  byType: Record<OrderEventType, number>;
  byActor: Record<string, number>;
  averageTimeBetweenEvents: number | null;
} {
  const byType = {} as Record<OrderEventType, number>;
  const byActor = {} as Record<string, number>;

  events.forEach(event => {
    // По типам
    byType[event.type] = (byType[event.type] || 0) + 1;

    // По актору
    if (event.actor?.type) {
      byActor[event.actor.type] = (byActor[event.actor.type] || 0) + 1;
    }
  });

  // Среднее время между событиями
  let averageTimeBetweenEvents: number | null = null;
  if (events.length > 1) {
    const sorted = getEventsTimeline(events);
    let totalDiff = 0;
    for (let i = 1; i < sorted.length; i++) {
      totalDiff += sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
    }
    averageTimeBetweenEvents = Math.round(totalDiff / (sorted.length - 1) / (1000 * 60));
  }

  return {
    total: events.length,
    byType,
    byActor,
    averageTimeBetweenEvents,
  };
}
