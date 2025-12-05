/**
 * Статус перемещения
 */
export enum TransferStatus {
  /** Черновик */
  DRAFT = 'DRAFT',
  /** Отправлено — товар в пути */
  SENT = 'SENT',
  /** Получено — перемещение завершено */
  RECEIVED = 'RECEIVED',
  /** Отменено */
  CANCELLED = 'CANCELLED',
}

/**
 * Тип перемещения
 */
export enum TransferType {
  /** Внутреннее — между локациями одного продавца */
  INTERNAL = 'INTERNAL',
  /** Из склада в магазин (пополнение) */
  WAREHOUSE_TO_SHOP = 'WAREHOUSE_TO_SHOP',
  /** Из магазина на склад (возврат на склад) */
  SHOP_TO_WAREHOUSE = 'SHOP_TO_WAREHOUSE',
  /** Между магазинами */
  SHOP_TO_SHOP = 'SHOP_TO_SHOP',
}
