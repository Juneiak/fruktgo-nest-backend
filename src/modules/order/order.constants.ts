import { OrderStatus } from './order.enums';

export const ORDER_STATUS_DISPLAY_MAP: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '🕒 Новый',
  [OrderStatus.ASSEMBLING]: '🍏 Собирается',
  [OrderStatus.AWAITING_COURIER]: '📦 Ожидает курьера',
  [OrderStatus.IN_DELIVERY]: '🚚 В доставке',
  [OrderStatus.DELIVERED]: '✅ Доставлен',
  [OrderStatus.CANCELLED]: '❌ Отменён',
  [OrderStatus.DECLINED]: '🚫 Отклонён',
  [OrderStatus.RETURNED]: '↩️ Возвращён',
};

// Время на каждый этап (в минутах)
export const ORDER_STAGE_TIMEOUTS = {
  [OrderStatus.PENDING]: 10, // 10 минут на принятие заказа
  [OrderStatus.ASSEMBLING]: 30, // 30 минут на сборку
  [OrderStatus.AWAITING_COURIER]: 15, // 15 минут на ожидание курьера
  [OrderStatus.IN_DELIVERY]: 60, // 60 минут на доставку
} as const;

// Цвета статусов для UI
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '#FFA500', // Orange
  [OrderStatus.ASSEMBLING]: '#4169E1', // Royal Blue
  [OrderStatus.AWAITING_COURIER]: '#9370DB', // Medium Purple
  [OrderStatus.IN_DELIVERY]: '#20B2AA', // Light Sea Green
  [OrderStatus.DELIVERED]: '#32CD32', // Lime Green
  [OrderStatus.CANCELLED]: '#DC143C', // Crimson
  [OrderStatus.DECLINED]: '#8B0000', // Dark Red
  [OrderStatus.RETURNED]: '#FF8C00', // Dark Orange
};
