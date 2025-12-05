/**
 * Тип возврата
 */
export enum ReturnType {
  /** Возврат от клиента (после доставки) */
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
  /** Возврат от курьера (не доставлен) */
  DELIVERY_RETURN = 'DELIVERY_RETURN',
  /** Возврат поставщику (брак, спор) */
  SUPPLIER_RETURN = 'SUPPLIER_RETURN',
}

/**
 * Статус возврата
 */
export enum ReturnStatus {
  /** Создан, ожидает осмотра */
  PENDING_INSPECTION = 'PENDING_INSPECTION',
  /** Осмотрен, решение принято */
  INSPECTED = 'INSPECTED',
  /** Завершён — товар обработан */
  COMPLETED = 'COMPLETED',
  /** Отклонён (для SUPPLIER_RETURN) */
  REJECTED = 'REJECTED',
  /** Отменён */
  CANCELLED = 'CANCELLED',
}

/**
 * Оценка состояния товара
 */
export enum ItemCondition {
  /** Отличное — как новый */
  EXCELLENT = 'EXCELLENT',
  /** Хорошее — незначительные следы */
  GOOD = 'GOOD',
  /** Удовлетворительное — можно продать со скидкой */
  SATISFACTORY = 'SATISFACTORY',
  /** Неудовлетворительное — только списание */
  UNSATISFACTORY = 'UNSATISFACTORY',
}

/**
 * Решение по позиции возврата
 */
export enum ReturnItemDecision {
  /** Вернуть на полку без изменений */
  RETURN_TO_SHELF = 'RETURN_TO_SHELF',
  /** Вернуть со скидкой */
  RETURN_WITH_DISCOUNT = 'RETURN_WITH_DISCOUNT',
  /** Списать */
  WRITE_OFF = 'WRITE_OFF',
  /** Для SUPPLIER_RETURN — ожидает решения поставщика */
  PENDING_SUPPLIER = 'PENDING_SUPPLIER',
}

/**
 * Причина возврата от клиента
 */
export enum CustomerReturnReason {
  /** Не понравился товар */
  CHANGED_MIND = 'CHANGED_MIND',
  /** Товар не соответствует описанию */
  NOT_AS_DESCRIBED = 'NOT_AS_DESCRIBED',
  /** Качество товара */
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  /** Повреждён при доставке */
  DAMAGED_IN_DELIVERY = 'DAMAGED_IN_DELIVERY',
  /** Истёк срок годности */
  EXPIRED = 'EXPIRED',
  /** Прочее */
  OTHER = 'OTHER',
}

/**
 * Причина возврата курьером
 */
export enum DeliveryReturnReason {
  /** Клиент отказался */
  CUSTOMER_REFUSED = 'CUSTOMER_REFUSED',
  /** Клиент не на месте */
  CUSTOMER_ABSENT = 'CUSTOMER_ABSENT',
  /** Неверный адрес */
  WRONG_ADDRESS = 'WRONG_ADDRESS',
  /** Истекло время доставки */
  DELIVERY_TIMEOUT = 'DELIVERY_TIMEOUT',
  /** Прочее */
  OTHER = 'OTHER',
}

/**
 * Причина возврата поставщику
 */
export enum SupplierReturnReason {
  /** Брак */
  DEFECTIVE = 'DEFECTIVE',
  /** Несоответствие заказу */
  WRONG_ITEMS = 'WRONG_ITEMS',
  /** Срок годности короче заявленного */
  SHORT_EXPIRATION = 'SHORT_EXPIRATION',
  /** Повреждена упаковка */
  DAMAGED_PACKAGING = 'DAMAGED_PACKAGING',
  /** Прочее */
  OTHER = 'OTHER',
}
