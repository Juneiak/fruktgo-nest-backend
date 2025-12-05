/**
 * Тип локации хранения
 */
export enum StorageLocationType {
  /** Магазин (торговая точка) */
  SHOP = 'SHOP',
  /** Склад */
  WAREHOUSE = 'WAREHOUSE',
}

/**
 * Статус локации
 */
export enum StorageLocationStatus {
  /** Активна */
  ACTIVE = 'ACTIVE',
  /** Временно закрыта (техобслуживание) */
  MAINTENANCE = 'MAINTENANCE',
  /** Закрыта */
  CLOSED = 'CLOSED',
}

/**
 * Тип оборудования хранения
 */
export enum StorageEquipmentType {
  /** Без оборудования (комнатная температура) */
  NONE = 'NONE',
  /** Холодильная витрина */
  REFRIGERATED_DISPLAY = 'REFRIGERATED_DISPLAY',
  /** Холодильная камера */
  COLD_ROOM = 'COLD_ROOM',
  /** Морозильник */
  FREEZER = 'FREEZER',
  /** Климат-контроль (температура + влажность) */
  CLIMATE_CONTROLLED = 'CLIMATE_CONTROLLED',
}
