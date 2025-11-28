import { ProductCategory, DiscountType, SurchargeType, IndividualTermsType } from './commission.enums';

/**
 * =====================================================
 * БАЗОВЫЕ СТАВКИ КОМИССИИ ПО КАТЕГОРИЯМ
 * =====================================================
 * 
 * Каждая категория товаров имеет свою базовую ставку.
 * Эти значения используются как отправная точка для расчёта.
 */
export const BASE_RATES: Record<ProductCategory, number> = {
  [ProductCategory.PRODUCE]: 18,      // Овощи/фрукты — высокая оборачиваемость
  [ProductCategory.DAIRY]: 20,        // Молочка — средние сроки хранения
  [ProductCategory.MEAT_FISH]: 22,    // Мясо/рыба — требуют холодильников
  [ProductCategory.GROCERY]: 20,      // Бакалея — стандартная категория
  [ProductCategory.BEVERAGES]: 18,    // Напитки — большие объёмы
  [ProductCategory.READY_FOOD]: 25,   // Готовая еда — короткие сроки
  [ProductCategory.OTHER]: 25,        // Прочее — по умолчанию
};

/**
 * Ограничения комиссии
 */
export const COMMISSION_LIMITS = {
  MIN_RATE: 10,           // Минимальная ставка (%)
  MAX_RATE: 40,           // Максимальная ставка (%)
  MIN_AMOUNT: 50,         // Минимальная сумма комиссии (₽) с заказа
  MAX_DISCOUNT: -10,      // Максимальная скидка (%)
  MAX_SURCHARGE: 15,      // Максимальная надбавка (%)
};

/**
 * =====================================================
 * МЕТРИКИ МАГАЗИНА ДЛЯ РАСЧЁТА СКИДОК/НАДБАВОК
 * =====================================================
 */
export interface ShopMetrics {
  // Временные метрики
  monthsActive: number;              // Сколько месяцев работает магазин
  
  // Финансовые метрики
  monthlyRevenue: number;            // Месячный оборот (₽)
  
  // Качественные метрики
  rating: number;                    // Рейтинг магазина (1-5)
  slaCompliance: number;             // % выполнения SLA (0-100)
  complaintsRate: number;            // % жалоб от заказов (0-1)
  returnRate: number;                // % возвратов (0-1)
  cancellationRate: number;          // % отмен (0-1)
  
  // Штрафные метрики (от оборота)
  penaltiesRate: number;             // % штрафов от оборота (0-1)
  shortagesRate: number;             // % недостач от оборота (0-1)
}

/**
 * =====================================================
 * РЕЗУЛЬТАТ РАСЧЁТА СКИДОК
 * =====================================================
 */
export interface CommissionDiscounts {
  loyalty: number;        // Скидка за стаж (отрицательное число)
  volume: number;         // Скидка за объём
  quality: number;        // Скидка за качество
  program: number;        // Скидка за участие в программах
  total: number;          // Сумма всех скидок
}

/**
 * =====================================================
 * РЕЗУЛЬТАТ РАСЧЁТА НАДБАВОК
 * =====================================================
 */
export interface CommissionSurcharges {
  quality: number;        // Надбавка за низкое качество (положительное число)
  operation: number;      // Надбавка за операционные проблемы
  finance: number;        // Надбавка за финансовые нарушения
  total: number;          // Сумма всех надбавок
}

/**
 * =====================================================
 * РЕЗУЛЬТАТ РАСЧЁТА КОМИССИИ ДЛЯ ПЕРИОДА
 * =====================================================
 * 
 * Полная детализация расчёта комиссии.
 * Эта структура сохраняется в SettlementPeriod для прозрачности.
 */
export interface CommissionCalculation {
  // Базовая информация
  baseRate: number;                   // Базовая ставка (%)
  mainCategory: ProductCategory;      // Основная категория магазина
  
  // Скидки и надбавки
  discounts: CommissionDiscounts;
  surcharges: CommissionSurcharges;
  
  // Итоговая ставка
  finalRate: number;                  // Итоговая ставка после всех корректировок (%)
  
  // Расчёт суммы
  revenue: number;                    // Оборот для расчёта (₽)
  amount: number;                     // Итоговая сумма комиссии (₽)
  
  // Метаданные
  calculatedAt: Date;                 // Когда был сделан расчёт
  periodId?: string;                  // ID расчётного периода (если применимо)
}

/**
 * =====================================================
 * ИНДИВИДУАЛЬНЫЕ УСЛОВИЯ
 * =====================================================
 * 
 * Специальные условия для конкретных продавцов,
 * которые переопределяют стандартный расчёт.
 */
export interface IndividualTerms {
  type: IndividualTermsType;
  
  // Для FIXED_RATE
  fixedRate?: number;                 // Фиксированная ставка (%)
  
  // Для PROGRESSIVE
  progressiveTiers?: Array<{
    from: number;                     // От какой суммы (₽)
    to: number | null;                // До какой суммы (null = без ограничения)
    rate: number;                     // Ставка для этого диапазона (%)
  }>;
  
  // Для CATEGORY_DISCOUNT
  categoryDiscounts?: Partial<Record<ProductCategory, number>>;
  
  // Общие поля
  validFrom: Date;                    // Начало действия
  validTo: Date | null;               // Окончание (null = бессрочно)
  reason: string;                     // Причина/обоснование
  approvedBy?: string;                // ID сотрудника платформы, одобрившего
}

/**
 * =====================================================
 * ПРОГНОЗ КОМИССИИ
 * =====================================================
 * 
 * Показывает продавцу, как можно снизить комиссию.
 */
export interface CommissionForecast {
  currentRate: number;                // Текущая ставка (%)
  improvements: Array<{
    condition: string;                // Что нужно сделать
    newRate: number;                  // Новая ставка после выполнения
    saving: number;                   // Экономия в ₽/месяц (приблизительно)
  }>;
}
