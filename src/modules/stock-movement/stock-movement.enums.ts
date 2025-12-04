/**
 * Тип движения товара
 */
export enum StockMovementType {
  /** Приёмка товара (увеличение остатков) */
  RECEIVING = 'receiving',
  
  /** Продажа (списание при выдаче заказа) */
  SALE = 'sale',
  
  /** Резервирование (при создании заказа) */
  RESERVATION = 'reservation',
  
  /** Отмена резерва (при отмене заказа) */
  RESERVATION_CANCEL = 'reservation_cancel',
  
  /** Перемещение между точками */
  TRANSFER = 'transfer',
  
  /** Списание (брак, просрочка, недостача) */
  WRITE_OFF = 'write_off',
  
  /** Корректировка (результат инвентаризации) */
  ADJUSTMENT = 'adjustment',
  
  /** Возврат товара от клиента */
  RETURN = 'return',
  
  /** Начальные остатки */
  INITIAL = 'initial',
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

/**
 * Тип связанного документа
 */
export enum StockMovementDocumentType {
  /** Заказ */
  ORDER = 'order',
  
  /** Документ перемещения */
  TRANSFER = 'transfer',
  
  /** Акт списания */
  WRITE_OFF = 'write_off',
  
  /** Акт инвентаризации */
  INVENTORY = 'inventory',
  
  /** Документ приёмки */
  RECEIVING = 'receiving',
  
  /** Ручная корректировка */
  MANUAL = 'manual',
}

/**
 * Тип актора, совершившего движение
 */
export enum StockMovementActorType {
  /** Сотрудник магазина */
  EMPLOYEE = 'employee',
  
  /** Система (автоматически) */
  SYSTEM = 'system',
  
  /** Администратор платформы */
  ADMIN = 'admin',
}
