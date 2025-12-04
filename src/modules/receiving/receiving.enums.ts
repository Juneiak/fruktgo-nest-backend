/**
 * Статус документа приёмки
 */
export enum ReceivingStatus {
  /** Черновик (можно редактировать) */
  DRAFT = 'draft',
  
  /** Подтверждён (остатки добавлены) */
  CONFIRMED = 'confirmed',
  
  /** Отменён */
  CANCELLED = 'cancelled',
}

/**
 * Тип поставки
 */
export enum ReceivingType {
  /** От поставщика */
  SUPPLIER = 'supplier',
  
  /** Перемещение с другой точки */
  TRANSFER = 'transfer',
  
  /** Возврат от покупателя */
  RETURN = 'return',
  
  /** Начальные остатки */
  INITIAL = 'initial',
  
  /** Другое */
  OTHER = 'other',
}
