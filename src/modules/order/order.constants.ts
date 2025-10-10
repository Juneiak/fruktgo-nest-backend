import { OrderStatus } from './order.enums';

export const ORDER_STATUS_DISPLAY_MAP: Record<string, string> = {
  [OrderStatus.PENDING]: '🕒 Новый',
  [OrderStatus.PREPARING]: '🍏 Готовится',
  [OrderStatus.AWAITING_COURIER]: '🚚 Ожидает курьера',
  [OrderStatus.DELIVERING]: '🚚 Доставляется',
  [OrderStatus.DELIVERED]: '✅ Доставлен',
  [OrderStatus.CANCELLED]: '❌ Отменён',
  [OrderStatus.DECLINED]: '❌ Отклонён',
  [OrderStatus.FAILED]: '❌ Провалилась',
};
