/**
 * Статус документа списания
 */
export enum WriteOffStatus {
  /** Черновик (можно редактировать) */
  DRAFT = 'draft',
  
  /** Подтверждён (остатки списаны) */
  CONFIRMED = 'confirmed',
  
  /** Отменён */
  CANCELLED = 'cancelled',
}

/**
 * Причина списания
 */
export enum WriteOffReason {
  /** Истёк срок годности */
  EXPIRED = 'expired',
  
  /** Брак/повреждение */
  DAMAGED = 'damaged',
  
  /** Недостача при инвентаризации */
  SHORTAGE = 'shortage',
  
  /** Порча (гниль и т.п.) */
  SPOILAGE = 'spoilage',
  
  /** Кража */
  THEFT = 'theft',
  
  /** Тестирование/дегустация */
  TESTING = 'testing',
  
  /** Другое */
  OTHER = 'other',
}
