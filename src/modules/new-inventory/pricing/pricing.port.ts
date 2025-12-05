import * as Commands from './pricing.commands';
import * as Queries from './pricing.queries';
import {
  PriceCalculation,
  MarginInfo,
  AutoDiscountResult,
  PricingConfig,
} from './pricing.types';
import { StorefrontProduct } from '../entities/storefront';

/**
 * Порт модуля Pricing
 */
export interface PricingPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Обновить закупочную цену из новой партии
   */
  updatePurchasePriceFromBatch(
    command: Commands.UpdatePurchasePriceFromBatchCommand,
  ): Promise<void>;

  /**
   * Применить скидку к товару
   */
  applyDiscount(command: Commands.ApplyDiscountCommand): Promise<void>;

  /**
   * Удалить скидку
   */
  removeDiscount(command: Commands.RemoveDiscountCommand): Promise<void>;

  /**
   * Автоматически применить скидки по сроку годности
   */
  autoApplyExpirationDiscounts(
    command: Commands.AutoApplyExpirationDiscountsCommand,
  ): Promise<AutoDiscountResult[]>;

  /**
   * Обновить цены товара
   */
  updateProductPrices(
    command: Commands.UpdateProductPricesCommand,
  ): Promise<void>;

  /**
   * Установить оптовые скидки
   */
  setBulkDiscounts(command: Commands.SetBulkDiscountsCommand): Promise<void>;

  /**
   * Обновить конфигурацию ценообразования
   */
  updatePricingConfig(
    command: Commands.UpdatePricingConfigCommand,
  ): Promise<PricingConfig>;

  /**
   * Пересчитать все цены витрины
   */
  recalculateStorefrontPrices(
    command: Commands.RecalculateStorefrontPricesCommand,
  ): Promise<void>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Рассчитать финальную цену
   */
  calculateFinalPrice(
    query: Queries.CalculateFinalPriceQuery,
  ): Promise<PriceCalculation>;

  /**
   * Рассчитать маржинальность
   */
  calculateMargin(query: Queries.CalculateMarginQuery): Promise<MarginInfo>;

  /**
   * Проверить прибыльность
   */
  checkProfitability(
    query: Queries.CheckProfitabilityQuery,
  ): Promise<{ isProfitable: boolean; margin: MarginInfo }>;

  /**
   * Получить товары с низкой маржой
   */
  getLowMarginProducts(
    query: Queries.GetLowMarginProductsQuery,
  ): Promise<Array<{ product: StorefrontProduct; margin: MarginInfo }>>;

  /**
   * Товары с истекающими скидками
   */
  getProductsWithExpiringDiscounts(
    query: Queries.GetProductsWithExpiringDiscountsQuery,
  ): Promise<StorefrontProduct[]>;

  /**
   * Товары, требующие скидку по сроку
   */
  getProductsRequiringExpirationDiscount(
    query: Queries.GetProductsRequiringExpirationDiscountQuery,
  ): Promise<Array<{ product: StorefrontProduct; requiredDiscount: number }>>;

  /**
   * Получить конфигурацию
   */
  getPricingConfig(
    query: Queries.GetPricingConfigQuery,
  ): Promise<PricingConfig | null>;

  /**
   * История изменения цен
   */
  getPriceHistory(
    query: Queries.GetPriceHistoryQuery,
  ): Promise<
    Array<{
      date: Date;
      oldPrice: number;
      newPrice: number;
      reason: string;
    }>
  >;

  /**
   * Симуляция цены
   */
  simulatePrice(query: Queries.SimulatePriceQuery): PriceCalculation;
}

export const PRICING_PORT = Symbol('PRICING_PORT');
