/**
 * Категория продукта (влияет на условия хранения)
 */
export enum ProductCategory {
  /** Фрукты */
  FRUITS = 'FRUITS',
  /** Овощи */
  VEGETABLES = 'VEGETABLES',
  /** Ягоды */
  BERRIES = 'BERRIES',
  /** Зелень */
  GREENS = 'GREENS',
  /** Орехи и сухофрукты */
  NUTS_DRIED = 'NUTS_DRIED',
  /** Молочная продукция */
  DAIRY = 'DAIRY',
  /** Мясо и птица */
  MEAT = 'MEAT',
  /** Рыба и морепродукты */
  SEAFOOD = 'SEAFOOD',
  /** Хлеб и выпечка */
  BAKERY = 'BAKERY',
  /** Бакалея */
  GROCERY = 'GROCERY',
  /** Напитки */
  BEVERAGES = 'BEVERAGES',
  /** Замороженные продукты */
  FROZEN = 'FROZEN',
  /** Другое */
  OTHER = 'OTHER',
}

/**
 * Единица измерения
 */
export enum ProductUnit {
  /** Килограмм */
  KG = 'KG',
  /** Грамм */
  G = 'G',
  /** Штука */
  PCS = 'PCS',
  /** Литр */
  L = 'L',
  /** Миллилитр */
  ML = 'ML',
  /** Упаковка */
  PACK = 'PACK',
  /** Пучок (для зелени) */
  BUNCH = 'BUNCH',
}

/**
 * Статус продукта
 */
export enum InventoryProductStatus {
  /** Активный — доступен для приёмки и продажи */
  ACTIVE = 'ACTIVE',
  /** Неактивный — нельзя создавать новые партии */
  INACTIVE = 'INACTIVE',
  /** Архивный — полностью скрыт */
  ARCHIVED = 'ARCHIVED',
  /** Сезонный — временно недоступен */
  SEASONAL = 'SEASONAL',
}

/**
 * Тип продукта по сроку хранения
 */
export enum ShelfLifeType {
  /** Скоропортящийся (до 7 дней) */
  PERISHABLE = 'PERISHABLE',
  /** Среднего хранения (7-30 дней) */
  MEDIUM = 'MEDIUM',
  /** Длительного хранения (30+ дней) */
  SHELF_STABLE = 'SHELF_STABLE',
  /** Замороженный */
  FROZEN = 'FROZEN',
}

/**
 * Источник происхождения
 */
export enum ProductOrigin {
  /** Локальный (местный) */
  LOCAL = 'LOCAL',
  /** Региональный */
  REGIONAL = 'REGIONAL',
  /** Импортный */
  IMPORTED = 'IMPORTED',
}
