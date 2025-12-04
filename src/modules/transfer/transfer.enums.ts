/**
 * Статус документа перемещения
 */
export enum TransferStatus {
  /** Черновик - можно редактировать */
  DRAFT = 'DRAFT',
  
  /** Отправлено - товар списан с отправителя */
  SENT = 'SENT',
  
  /** Получено - товар оприходован получателем */
  RECEIVED = 'RECEIVED',
  
  /** Отменено */
  CANCELLED = 'CANCELLED',
}

/**
 * Тип точки хранения (для перемещений)
 */
export enum TransferLocationType {
  /** Магазин */
  SHOP = 'SHOP',
  
  /** Склад */
  WAREHOUSE = 'WAREHOUSE',
}
