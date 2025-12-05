import { Storefront, StorefrontProduct } from './storefront.schema';
import * as Commands from './storefront.commands';
import * as Queries from './storefront.queries';

/**
 * Результат расчёта цены
 */
export interface PriceCalculation {
  basePrice: number;
  discounts: Array<{
    type: string;
    value: number;
    reason: string;
    amount: number;
  }>;
  totalDiscount: number;
  finalPrice: number;
  finalPricePerUnit: number;
}

/**
 * Статистика витрины
 */
export interface StorefrontStatistics {
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  outOfStockProducts: number;
  productsWithDiscount: number;
  averageDiscount: number;
  totalStockValue: number;
}

/**
 * Порт модуля Storefront
 */
export interface StorefrontPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать витрину */
  create(command: Commands.CreateStorefrontCommand): Promise<Storefront>;

  /** Добавить товар */
  addProduct(command: Commands.AddProductCommand): Promise<Storefront>;

  /** Обновить ценообразование */
  updateProductPricing(
    command: Commands.UpdateProductPricingCommand,
  ): Promise<Storefront>;

  /** Обновить видимость */
  updateProductVisibility(
    command: Commands.UpdateProductVisibilityCommand,
  ): Promise<Storefront>;

  /** Изменить статус товара */
  updateProductStatus(
    command: Commands.UpdateProductStatusCommand,
  ): Promise<Storefront>;

  /** Применить скидку */
  applyDiscount(command: Commands.ApplyDiscountCommand): Promise<Storefront>;

  /** Удалить скидку */
  removeDiscount(command: Commands.RemoveDiscountCommand): Promise<Storefront>;

  /** Очистить все скидки */
  clearDiscounts(command: Commands.ClearDiscountsCommand): Promise<Storefront>;

  /** Синхронизировать остатки */
  syncProductStock(command: Commands.SyncProductStockCommand): Promise<Storefront>;

  /** Удалить товар */
  removeProduct(command: Commands.RemoveProductCommand): Promise<Storefront>;

  /** Изменить статус витрины */
  updateStatus(command: Commands.UpdateStorefrontStatusCommand): Promise<Storefront>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetStorefrontByIdQuery): Promise<Storefront | null>;

  /** Получить по магазину */
  getByShop(query: Queries.GetStorefrontByShopQuery): Promise<Storefront | null>;

  /** Получить витрины продавца */
  getBySeller(
    query: Queries.GetStorefrontsBySellerQuery,
  ): Promise<{ items: Storefront[]; total: number }>;

  /** Получить товары витрины */
  getProducts(
    query: Queries.GetStorefrontProductsQuery,
  ): Promise<{ items: StorefrontProduct[]; total: number }>;

  /** Получить товар по ID */
  getProduct(
    query: Queries.GetStorefrontProductQuery,
  ): Promise<StorefrontProduct | null>;

  /** Рассчитать финальную цену */
  calculateFinalPrice(
    query: Queries.CalculateFinalPriceQuery,
  ): Promise<PriceCalculation>;

  /** Товары с истекающими скидками */
  getProductsWithExpiringDiscounts(
    query: Queries.GetProductsWithExpiringDiscountsQuery,
  ): Promise<StorefrontProduct[]>;

  /** Статистика */
  getStatistics(
    query: Queries.GetStorefrontStatisticsQuery,
  ): Promise<StorefrontStatistics>;
}

export const STOREFRONT_PORT = Symbol('STOREFRONT_PORT');
