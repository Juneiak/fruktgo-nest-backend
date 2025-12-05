/**
 * Тип локации
 */
export enum LocationType {
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
}

/**
 * Статус остатка партии в локации
 */
export enum BatchLocationStatus {
  /** Активен, можно продавать */
  ACTIVE = 'ACTIVE',
  /** Полностью израсходован в этой локации */
  DEPLETED = 'DEPLETED',
  /** Перемещён в другую локацию */
  TRANSFERRED = 'TRANSFERRED',
}

/**
 * Причина изменения количества
 */
export enum QuantityChangeReason {
  /** Приёмка */
  RECEIVING = 'RECEIVING',
  /** Продажа */
  SALE = 'SALE',
  /** Списание */
  WRITE_OFF = 'WRITE_OFF',
  /** Перемещение (исходящее) */
  TRANSFER_OUT = 'TRANSFER_OUT',
  /** Перемещение (входящее) */
  TRANSFER_IN = 'TRANSFER_IN',
  /** Возврат от покупателя */
  RETURN = 'RETURN',
  /** Инвентаризация (корректировка) */
  INVENTORY_ADJUSTMENT = 'INVENTORY_ADJUSTMENT',
  /** Резервирование */
  RESERVATION = 'RESERVATION',
  /** Снятие резерва */
  RELEASE_RESERVATION = 'RELEASE_RESERVATION',
  /** Усушка */
  SHRINKAGE = 'SHRINKAGE',
  /** Смешивание партий */
  MIXING = 'MIXING',
}
