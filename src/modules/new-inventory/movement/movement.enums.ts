/**
 * Тип движения товара
 */
export enum MovementType {
  // ═══════════════════════════════════════════════════════════════
  // ПРИХОД (+)
  // ═══════════════════════════════════════════════════════════════

  /** Приёмка от поставщика */
  RECEIVING = 'RECEIVING',
  /** Приход по перемещению */
  TRANSFER_IN = 'TRANSFER_IN',
  /** Возврат на полку */
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  /** Корректировка + (инвентаризация) */
  ADJUSTMENT_PLUS = 'ADJUSTMENT_PLUS',
  /** Начальные остатки */
  INITIAL = 'INITIAL',

  // ═══════════════════════════════════════════════════════════════
  // РАСХОД (-)
  // ═══════════════════════════════════════════════════════════════

  /** Продажа (онлайн заказ) */
  SALE = 'SALE',
  /** Офлайн продажа */
  OFFLINE_SALE = 'OFFLINE_SALE',
  /** Отправка по перемещению */
  TRANSFER_OUT = 'TRANSFER_OUT',
  /** Списание */
  WRITE_OFF = 'WRITE_OFF',
  /** Корректировка - (инвентаризация) */
  ADJUSTMENT_MINUS = 'ADJUSTMENT_MINUS',
  /** Возврат поставщику */
  SUPPLIER_RETURN = 'SUPPLIER_RETURN',

  // ═══════════════════════════════════════════════════════════════
  // РЕЗЕРВИРОВАНИЕ (не меняет остаток, только доступное)
  // ═══════════════════════════════════════════════════════════════

  /** Создание резерва */
  RESERVATION = 'RESERVATION',
  /** Снятие резерва */
  RESERVATION_RELEASE = 'RESERVATION_RELEASE',
  /** Подтверждение резерва (продажа) */
  RESERVATION_CONFIRM = 'RESERVATION_CONFIRM',
}

/**
 * Тип документа-источника движения
 */
export enum MovementDocumentType {
  ORDER = 'ORDER',
  RECEIVING = 'RECEIVING',
  TRANSFER = 'TRANSFER',
  WRITE_OFF = 'WRITE_OFF',
  RETURN = 'RETURN',
  AUDIT = 'AUDIT',
  RESERVATION = 'RESERVATION',
  MANUAL = 'MANUAL',
}

/**
 * Тип актора движения
 */
export enum MovementActorType {
  EMPLOYEE = 'EMPLOYEE',
  SELLER = 'SELLER',
  SYSTEM = 'SYSTEM',
  CUSTOMER = 'CUSTOMER',
}
