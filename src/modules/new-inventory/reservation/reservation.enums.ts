/**
 * Статус резервирования
 */
export enum ReservationStatus {
  /** Активный резерв */
  ACTIVE = 'ACTIVE',
  /** Подтверждён (товар отдан) */
  CONFIRMED = 'CONFIRMED',
  /** Отменён */
  CANCELLED = 'CANCELLED',
  /** Истёк по времени */
  EXPIRED = 'EXPIRED',
  /** Частично исполнен */
  PARTIALLY_CONFIRMED = 'PARTIALLY_CONFIRMED',
}

/**
 * Причина отмены резерва
 */
export enum ReservationCancelReason {
  /** Отмена заказа клиентом */
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  /** Отклонение заказа магазином */
  ORDER_DECLINED = 'ORDER_DECLINED',
  /** Истечение срока резерва */
  EXPIRED = 'EXPIRED',
  /** Недостаток товара при сборке */
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  /** Ручная отмена */
  MANUAL = 'MANUAL',
}

/**
 * Тип резервирования
 */
export enum ReservationType {
  /** Онлайн заказ */
  ORDER = 'ORDER',
  /** Предзаказ */
  PREORDER = 'PREORDER',
  /** Временный резерв (корзина) */
  CART = 'CART',
}
