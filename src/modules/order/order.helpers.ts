import { OrderStatus, OrderStatusFlow, OrderStatusTerminal, OrderStatusActive } from './order.enums';

/**
 * Проверяет, является ли статус терминальным (конечным)
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return OrderStatusTerminal.includes(status as any);
}

/**
 * Проверяет, является ли статус активным (заказ в работе)
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return OrderStatusActive.includes(status as any);
}

/**
 * Проверяет, можно ли перейти из одного статуса в другой
 */
export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  // Из терминального статуса нельзя никуда перейти
  if (isTerminalStatus(from)) return false;

  // В CANCELLED и DECLINED можно перейти из любого нетерминального статуса
  if (to === OrderStatus.CANCELLED || to === OrderStatus.DECLINED) return true;

  // В RETURNED можно только из DELIVERED
  if (to === OrderStatus.RETURNED) return from === OrderStatus.DELIVERED;

  // Для остальных проверяем последовательность в flow
  const fromIndex = OrderStatusFlow.indexOf(from as any);
  const toIndex = OrderStatusFlow.indexOf(to as any);

  // Можно перейти только вперед по flow
  return fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex;
}

/**
 * Возвращает следующий возможный статус в нормальном flow
 */
export function getNextStatus(current: OrderStatus): OrderStatus | null {
  if (isTerminalStatus(current)) return null;

  const currentIndex = OrderStatusFlow.indexOf(current as any);
  if (currentIndex === -1 || currentIndex === OrderStatusFlow.length - 1) return null;

  return OrderStatusFlow[currentIndex + 1];
}

/**
 * Возвращает все возможные статусы для перехода из текущего
 */
export function getPossibleTransitions(current: OrderStatus): OrderStatus[] {
  if (isTerminalStatus(current)) return [];

  const transitions: OrderStatus[] = [];

  // Всегда можно отменить или отклонить
  transitions.push(OrderStatus.CANCELLED, OrderStatus.DECLINED);

  // Следующий статус в flow
  const next = getNextStatus(current);
  if (next) transitions.push(next);

  // Из DELIVERED можно вернуть
  if (current === OrderStatus.DELIVERED) transitions.push(OrderStatus.RETURNED);

  return [...new Set(transitions)]; // Убираем дубликаты
}

/**
 * Возвращает человекочитаемое название статуса на русском
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Ожидает принятия',
    [OrderStatus.ASSEMBLING]: 'Собирается',
    [OrderStatus.AWAITING_COURIER]: 'Ожидает курьера',
    [OrderStatus.IN_DELIVERY]: 'В доставке',
    [OrderStatus.DELIVERED]: 'Доставлен',
    [OrderStatus.CANCELLED]: 'Отменен',
    [OrderStatus.DECLINED]: 'Отклонен',
    [OrderStatus.RETURNED]: 'Возвращен',
  };

  return labels[status] || status;
}

/**
 * Возвращает название стейджа, который нужно заполнить ПРИ ПЕРЕХОДЕ в этот статус
 * Логика: переход в статус означает завершение предыдущего этапа
 */
export function getCompletedStageForStatus(status: OrderStatus): string | null {
  const stageMap: Record<OrderStatus, string | null> = {
    [OrderStatus.PENDING]: null,                      // Создание - ничего не завершено
    [OrderStatus.ASSEMBLING]: null,                   // Начало сборки - ничего не завершено
    [OrderStatus.AWAITING_COURIER]: 'assembledStage', // Завершили сборку
    [OrderStatus.IN_DELIVERY]: 'courierStage',        // Курьер забрал
    [OrderStatus.DELIVERED]: 'deliveredStage',        // Доставили
    [OrderStatus.CANCELLED]: 'canceledStage',         // Отменили
    [OrderStatus.DECLINED]: 'declinedStage',          // Отклонили
    [OrderStatus.RETURNED]: 'returnedStage',          // Вернули
  };

  return stageMap[status] || null;
}
