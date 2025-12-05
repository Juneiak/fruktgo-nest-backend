import { Types } from 'mongoose';
import { SalesChannel, MarginStatus } from './pricing.enums';
import { DiscountType, DiscountReason } from '../entities/storefront/storefront.enums';

/**
 * Правило автоскидки по сроку годности
 */
export interface ExpirationDiscountRule {
  /** Дней до истечения срока */
  daysUntilExpiration: number;
  /** Процент скидки */
  discountPercent: number;
  /** Описание правила */
  description?: string;
}

/**
 * Применённая скидка в расчёте
 */
export interface AppliedDiscount {
  /** Тип скидки */
  type: DiscountType;
  /** Значение (сумма или процент) */
  value: number;
  /** Причина */
  reason: DiscountReason;
  /** Сумма скидки в рублях */
  amount: number;
  /** Описание */
  description?: string;
}

/**
 * Результат расчёта цены
 */
export interface PriceCalculation {
  /** Базовая цена (до скидок) */
  basePrice: number;
  /** Базовая цена за единицу */
  basePricePerUnit: number;
  /** Количество */
  quantity: number;
  /** Канал продаж */
  channel: SalesChannel;
  /** Применённые скидки */
  discounts: AppliedDiscount[];
  /** Общая сумма скидок */
  totalDiscount: number;
  /** Финальная цена */
  finalPrice: number;
  /** Финальная цена за единицу */
  finalPricePerUnit: number;
}

/**
 * Информация о маржинальности
 */
export interface MarginInfo {
  /** Закупочная цена за единицу */
  purchasePrice: number;
  /** Цена продажи за единицу */
  sellingPrice: number;
  /** Абсолютная маржа за единицу */
  marginAbsolute: number;
  /** Маржа в процентах */
  marginPercent: number;
  /** Статус маржинальности */
  status: MarginStatus;
}

/**
 * Оптовая скидка (bulk discount)
 */
export interface BulkDiscount {
  /** Минимальное количество для скидки */
  minQuantity: number;
  /** Процент скидки */
  discountPercent: number;
}

/**
 * Конфигурация ценообразования продавца
 */
export interface PricingConfig {
  /** ID продавца */
  seller: Types.ObjectId | string;
  
  /** Минимальная допустимая маржа (%) */
  minMarginPercent: number;
  
  /** Правила автоскидок по сроку годности */
  expirationDiscountRules: ExpirationDiscountRule[];
  
  /** Оптовые скидки */
  bulkDiscounts: BulkDiscount[];
  
  /** Применять скидки по сроку автоматически */
  autoApplyExpirationDiscounts: boolean;
  
  /** Стратегия расчёта закупочной цены по умолчанию */
  defaultPurchasePriceStrategy: string;
}

/**
 * Результат применения автоскидок
 */
export interface AutoDiscountResult {
  /** ID витрины */
  storefrontId: string;
  /** ID товара */
  productId: string;
  /** Применённые скидки */
  appliedDiscounts: AppliedDiscount[];
  /** Старая цена */
  oldPrice: number;
  /** Новая цена */
  newPrice: number;
  /** Причина применения */
  appliedReason: string;
}
