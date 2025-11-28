/**
 * Категории товаров для расчёта базовой ставки комиссии
 * 
 * Каждая категория имеет свою базовую ставку:
 * - PRODUCE (овощи/фрукты) — 18%
 * - DAIRY (молочка) — 20%
 * - MEAT_FISH (мясо/рыба) — 22%
 * - GROCERY (бакалея) — 20%
 * - BEVERAGES (напитки) — 18%
 * - READY_FOOD (готовая еда) — 25%
 * - OTHER (прочее) — 25%
 */
export enum ProductCategory {
  PRODUCE = 'produce',           // Овощи и фрукты — 18%
  DAIRY = 'dairy',               // Молочные продукты — 20%
  MEAT_FISH = 'meat_fish',       // Мясо и рыба — 22%
  GROCERY = 'grocery',           // Бакалея — 20%
  BEVERAGES = 'beverages',       // Напитки — 18%
  READY_FOOD = 'ready_food',     // Готовая еда — 25%
  OTHER = 'other',               // Прочее — 25%
}

/**
 * Типы скидок на комиссию
 * 
 * Скидки снижают итоговую ставку комиссии:
 * - LOYALTY — за стаж работы с платформой
 * - VOLUME — за объём продаж
 * - QUALITY — за высокий рейтинг и качество
 * - PROGRAM — за участие в программах платформы
 */
export enum DiscountType {
  LOYALTY = 'loyalty',           // Скидка за стаж
  VOLUME = 'volume',             // Скидка за объём
  QUALITY = 'quality',           // Скидка за качество
  PROGRAM = 'program',           // Скидка за участие в программах
}

/**
 * Типы надбавок к комиссии (штрафных)
 * 
 * Надбавки увеличивают итоговую ставку комиссии:
 * - QUALITY — за низкое качество (много возвратов, жалоб)
 * - OPERATION — за операционные нарушения (отмены, задержки)
 * - FINANCE — за финансовые нарушения (штрафы, недостачи)
 */
export enum SurchargeType {
  QUALITY = 'quality',           // Надбавка за низкое качество
  OPERATION = 'operation',       // Надбавка за операционные проблемы
  FINANCE = 'finance',           // Надбавка за финансовые нарушения
}

/**
 * Типы индивидуальных условий
 * 
 * Специальные условия для конкретных продавцов:
 * - FIXED_RATE — фиксированная ставка (например, 15% на год)
 * - PROGRESSIVE — прогрессивная шкала (меньше ставка при большем обороте)
 * - CATEGORY_DISCOUNT — скидки на определённые категории
 */
export enum IndividualTermsType {
  FIXED_RATE = 'fixed_rate',           // Фиксированная ставка
  PROGRESSIVE = 'progressive',          // Прогрессивная шкала
  CATEGORY_DISCOUNT = 'category_discount', // Категориальные скидки
}

/**
 * Статусы апелляции на комиссию
 */
export enum CommissionAppealStatus {
  PENDING = 'pending',           // На рассмотрении
  APPROVED = 'approved',         // Одобрена
  REJECTED = 'rejected',         // Отклонена
}
