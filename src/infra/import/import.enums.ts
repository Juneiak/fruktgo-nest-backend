/**
 * Тип источника импорта
 */
export enum ImportSourceType {
  /** CommerceML 2.0 (1С) */
  COMMERCE_ML = 'COMMERCE_ML',
  
  /** Excel файл */
  EXCEL = 'EXCEL',
  
  /** CSV файл */
  CSV = 'CSV',
}

/**
 * Тип данных для импорта
 */
export enum ImportDataType {
  /** Товары (Product) */
  PRODUCTS = 'PRODUCTS',
  
  /** Остатки на складе */
  WAREHOUSE_STOCK = 'WAREHOUSE_STOCK',
  
  /** Остатки в магазине */
  SHOP_STOCK = 'SHOP_STOCK',
  
  /** Цены */
  PRICES = 'PRICES',
}

/**
 * Статус задания импорта
 */
export enum ImportJobStatus {
  /** В ожидании обработки */
  PENDING = 'PENDING',
  
  /** В процессе */
  PROCESSING = 'PROCESSING',
  
  /** Завершено успешно */
  COMPLETED = 'COMPLETED',
  
  /** Завершено с ошибками */
  COMPLETED_WITH_ERRORS = 'COMPLETED_WITH_ERRORS',
  
  /** Ошибка */
  FAILED = 'FAILED',
}
