import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { PricingPort } from './pricing.port';
import { SalesChannel, MarginStatus } from './pricing.enums';
import { PurchasePriceStrategy } from '../entities/product-template/product-template.enums';
import {
  DiscountType,
  DiscountReason,
} from '../entities/storefront/storefront.enums';
import {
  PriceCalculation,
  MarginInfo,
  AutoDiscountResult,
  PricingConfig,
  ExpirationDiscountRule,
  AppliedDiscount,
} from './pricing.types';
import * as Commands from './pricing.commands';
import * as Queries from './pricing.queries';
import {
  STOREFRONT_PORT,
  StorefrontPort,
  StorefrontProduct,
  StorefrontCommands,
  StorefrontQueries,
} from '../entities/storefront';

/** Правила скидок по умолчанию */
const DEFAULT_EXPIRATION_RULES: ExpirationDiscountRule[] = [
  { daysUntilExpiration: 3, discountPercent: 30, description: 'Критичный срок' },
  { daysUntilExpiration: 5, discountPercent: 20, description: 'Срок истекает' },
  { daysUntilExpiration: 7, discountPercent: 10, description: 'Скоро истечёт' },
];

/** Минимальная маржа по умолчанию */
const DEFAULT_MIN_MARGIN_PERCENT = 15;

@Injectable()
export class PricingService implements PricingPort {
  /** In-memory хранилище конфигураций (в продакшене — MongoDB) */
  private configs = new Map<string, PricingConfig>();

  constructor(
    @Inject(STOREFRONT_PORT)
    private readonly storefrontPort: StorefrontPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async updatePurchasePriceFromBatch(
    command: Commands.UpdatePurchasePriceFromBatchCommand,
  ): Promise<void> {
    const { data } = command;

    const product = await this.storefrontPort.getProduct(
      new StorefrontQueries.GetStorefrontProductQuery(
        data.storefrontId,
        data.productId,
      ),
    );

    if (!product) {
      throw new Error('Product not found');
    }

    let newPurchasePrice: number;

    switch (data.strategy) {
      case PurchasePriceStrategy.LAST:
        newPurchasePrice = data.batchPurchasePrice;
        break;

      case PurchasePriceStrategy.WEIGHTED_AVERAGE:
        const currentStock = product.stockQuantity;
        const currentPrice = product.pricing.purchasePrice || data.batchPurchasePrice;
        const totalQuantity = currentStock + data.batchQuantity;

        if (totalQuantity > 0) {
          newPurchasePrice =
            (currentPrice * currentStock + data.batchPurchasePrice * data.batchQuantity) /
            totalQuantity;
        } else {
          newPurchasePrice = data.batchPurchasePrice;
        }
        break;

      case PurchasePriceStrategy.FIFO_AVERAGE:
        // Для FIFO берём среднюю из доступных партий
        // Упрощённая реализация — как LAST
        newPurchasePrice = data.batchPurchasePrice;
        break;

      default:
        newPurchasePrice = data.batchPurchasePrice;
    }

    await this.storefrontPort.updateProductPricing(
      new StorefrontCommands.UpdateProductPricingCommand(
        data.storefrontId,
        data.productId,
        { purchasePrice: newPurchasePrice },
      ),
    );
  }

  async applyDiscount(command: Commands.ApplyDiscountCommand): Promise<void> {
    const { data } = command;

    await this.storefrontPort.applyDiscount(
      new StorefrontCommands.ApplyDiscountCommand(
        data.storefrontId,
        data.productId,
        {
          type: data.type,
          value: data.value,
          reason: data.reason,
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description,
          appliedBy: data.appliedBy,
        },
      ),
    );
  }

  async removeDiscount(command: Commands.RemoveDiscountCommand): Promise<void> {
    const { data } = command;

    await this.storefrontPort.removeDiscount(
      new StorefrontCommands.RemoveDiscountCommand(
        data.storefrontId,
        data.productId,
        data.reason,
      ),
    );
  }

  async autoApplyExpirationDiscounts(
    command: Commands.AutoApplyExpirationDiscountsCommand,
  ): Promise<AutoDiscountResult[]> {
    const { data } = command;
    const rules = data.rules || DEFAULT_EXPIRATION_RULES;
    const results: AutoDiscountResult[] = [];

    const storefront = await this.storefrontPort.getById(
      new StorefrontQueries.GetStorefrontByIdQuery(data.storefrontId),
    );

    if (!storefront) {
      return results;
    }

    const now = new Date();

    for (const product of storefront.products) {
      if (!product.nearestExpirationDate) continue;

      const daysUntilExpiration = Math.floor(
        (product.nearestExpirationDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // Находим подходящее правило
      const applicableRule = rules
        .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
        .find((rule) => daysUntilExpiration <= rule.daysUntilExpiration);

      if (!applicableRule) continue;

      // Проверяем, есть ли уже скидка EXPIRATION
      const hasExpirationDiscount = product.pricing.discounts.some(
        (d) => d.reason === DiscountReason.EXPIRATION,
      );

      // Проверяем, нужно ли обновить скидку
      const currentDiscount = product.pricing.discounts.find(
        (d) => d.reason === DiscountReason.EXPIRATION,
      );

      if (
        currentDiscount &&
        currentDiscount.type === DiscountType.PERCENT &&
        currentDiscount.value >= applicableRule.discountPercent
      ) {
        // Скидка уже достаточная
        continue;
      }

      const oldPrice = product.pricing.finalOnlinePrice || product.pricing.onlinePrice;

      // Удаляем старую скидку по сроку, если есть
      if (hasExpirationDiscount) {
        await this.storefrontPort.removeDiscount(
          new StorefrontCommands.RemoveDiscountCommand(
            data.storefrontId,
            product.product,
            DiscountReason.EXPIRATION,
          ),
        );
      }

      // Применяем новую скидку
      await this.storefrontPort.applyDiscount(
        new StorefrontCommands.ApplyDiscountCommand(
          data.storefrontId,
          product.product,
          {
            type: DiscountType.PERCENT,
            value: applicableRule.discountPercent,
            reason: DiscountReason.EXPIRATION,
            description: applicableRule.description || `Скидка: ${daysUntilExpiration} дней до истечения`,
            endDate: product.nearestExpirationDate,
          },
        ),
      );

      const discountAmount = (product.pricing.onlinePrice * applicableRule.discountPercent) / 100;
      const newPrice = product.pricing.onlinePrice - discountAmount;

      results.push({
        storefrontId: data.storefrontId.toString(),
        productId: product.product.toHexString(),
        appliedDiscounts: [
          {
            type: DiscountType.PERCENT,
            value: applicableRule.discountPercent,
            reason: DiscountReason.EXPIRATION,
            amount: discountAmount,
            description: applicableRule.description,
          },
        ],
        oldPrice,
        newPrice,
        appliedReason: `${daysUntilExpiration} дней до истечения срока`,
      });
    }

    return results;
  }

  async updateProductPrices(
    command: Commands.UpdateProductPricesCommand,
  ): Promise<void> {
    const { data } = command;

    await this.storefrontPort.updateProductPricing(
      new StorefrontCommands.UpdateProductPricingCommand(
        data.storefrontId,
        data.productId,
        {
          onlinePrice: data.onlinePrice,
          offlinePrice: data.offlinePrice,
        },
      ),
    );
  }

  async setBulkDiscounts(
    command: Commands.SetBulkDiscountsCommand,
  ): Promise<void> {
    // В текущей реализации оптовые скидки хранятся в конфигурации
    // Расширение: можно добавить поле bulkDiscounts в StorefrontProduct
    console.log('Bulk discounts set:', command.data);
  }

  async updatePricingConfig(
    command: Commands.UpdatePricingConfigCommand,
  ): Promise<PricingConfig> {
    const { data } = command;
    const sellerId = data.sellerId.toString();

    const existing = this.configs.get(sellerId) || {
      seller: new Types.ObjectId(sellerId),
      minMarginPercent: DEFAULT_MIN_MARGIN_PERCENT,
      expirationDiscountRules: DEFAULT_EXPIRATION_RULES,
      bulkDiscounts: [],
      autoApplyExpirationDiscounts: true,
      defaultPurchasePriceStrategy: PurchasePriceStrategy.WEIGHTED_AVERAGE,
    };

    const updated: PricingConfig = {
      ...existing,
      minMarginPercent: data.minMarginPercent ?? existing.minMarginPercent,
      expirationDiscountRules:
        data.expirationDiscountRules ?? existing.expirationDiscountRules,
      bulkDiscounts: data.bulkDiscounts ?? existing.bulkDiscounts,
      autoApplyExpirationDiscounts:
        data.autoApplyExpirationDiscounts ?? existing.autoApplyExpirationDiscounts,
      defaultPurchasePriceStrategy:
        data.defaultPurchasePriceStrategy ?? existing.defaultPurchasePriceStrategy,
    };

    this.configs.set(sellerId, updated);
    return updated;
  }

  async recalculateStorefrontPrices(
    command: Commands.RecalculateStorefrontPricesCommand,
  ): Promise<void> {
    const storefront = await this.storefrontPort.getById(
      new StorefrontQueries.GetStorefrontByIdQuery(command.storefrontId),
    );

    if (!storefront) return;

    // Пересчёт происходит автоматически при изменении скидок в Storefront
    // Здесь можно добавить дополнительную логику, например batch recalculation
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async calculateFinalPrice(
    query: Queries.CalculateFinalPriceQuery,
  ): Promise<PriceCalculation> {
    const { data } = query;

    const priceCalc = await this.storefrontPort.calculateFinalPrice(
      new StorefrontQueries.CalculateFinalPriceQuery({
        storefrontId: data.storefrontId,
        productId: data.productId,
        quantity: data.quantity,
        channel: data.channel === SalesChannel.ONLINE ? 'online' : 'offline',
      }),
    );

    return {
      basePrice: priceCalc.basePrice,
      basePricePerUnit: priceCalc.basePrice / data.quantity,
      quantity: data.quantity,
      channel: data.channel,
      discounts: priceCalc.discounts.map((d) => ({
        type: d.type as DiscountType,
        value: d.value,
        reason: d.reason as DiscountReason,
        amount: d.amount,
      })),
      totalDiscount: priceCalc.totalDiscount,
      finalPrice: priceCalc.finalPrice,
      finalPricePerUnit: priceCalc.finalPricePerUnit,
    };
  }

  async calculateMargin(query: Queries.CalculateMarginQuery): Promise<MarginInfo> {
    const { data } = query;

    const product = await this.storefrontPort.getProduct(
      new StorefrontQueries.GetStorefrontProductQuery(
        data.storefrontId,
        data.productId,
      ),
    );

    if (!product) {
      throw new Error('Product not found');
    }

    const purchasePrice = product.pricing.purchasePrice || 0;
    const sellingPrice =
      data.channel === SalesChannel.ONLINE
        ? product.pricing.finalOnlinePrice || product.pricing.onlinePrice
        : product.pricing.finalOfflinePrice || product.pricing.offlinePrice;

    return this.calculateMarginInfo(purchasePrice, sellingPrice);
  }

  async checkProfitability(
    query: Queries.CheckProfitabilityQuery,
  ): Promise<{ isProfitable: boolean; margin: MarginInfo }> {
    const margin = await this.calculateMargin(
      new Queries.CalculateMarginQuery({
        storefrontId: query.data.storefrontId,
        productId: query.data.productId,
        channel: SalesChannel.ONLINE,
      }),
    );

    const minMargin = query.data.minMarginPercent ?? DEFAULT_MIN_MARGIN_PERCENT;
    const isProfitable = margin.marginPercent >= minMargin;

    return { isProfitable, margin };
  }

  async getLowMarginProducts(
    query: Queries.GetLowMarginProductsQuery,
  ): Promise<Array<{ product: StorefrontProduct; margin: MarginInfo }>> {
    const { items } = await this.storefrontPort.getProducts(
      new StorefrontQueries.GetStorefrontProductsQuery({
        storefrontId: query.data.storefrontId,
        limit: 1000,
      }),
    );

    const results: Array<{ product: StorefrontProduct; margin: MarginInfo }> = [];

    for (const product of items) {
      const margin = this.calculateMarginInfo(
        product.pricing.purchasePrice || 0,
        product.pricing.finalOnlinePrice || product.pricing.onlinePrice,
      );

      if (margin.marginPercent < query.data.marginThreshold) {
        results.push({ product, margin });
      }
    }

    return results.sort((a, b) => a.margin.marginPercent - b.margin.marginPercent);
  }

  async getProductsWithExpiringDiscounts(
    query: Queries.GetProductsWithExpiringDiscountsQuery,
  ): Promise<StorefrontProduct[]> {
    return this.storefrontPort.getProductsWithExpiringDiscounts(
      new StorefrontQueries.GetProductsWithExpiringDiscountsQuery({
        storefrontId: query.data.storefrontId,
        withinDays: query.data.withinDays,
      }),
    );
  }

  async getProductsRequiringExpirationDiscount(
    query: Queries.GetProductsRequiringExpirationDiscountQuery,
  ): Promise<Array<{ product: StorefrontProduct; requiredDiscount: number }>> {
    const { data } = query;
    const rules = data.rules || DEFAULT_EXPIRATION_RULES;
    const results: Array<{ product: StorefrontProduct; requiredDiscount: number }> = [];

    const { items } = await this.storefrontPort.getProducts(
      new StorefrontQueries.GetStorefrontProductsQuery({
        storefrontId: data.storefrontId,
        inStock: true,
        limit: 1000,
      }),
    );

    const now = new Date();

    for (const product of items) {
      if (!product.nearestExpirationDate) continue;

      const daysUntilExpiration = Math.floor(
        (product.nearestExpirationDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const applicableRule = rules
        .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
        .find((rule) => daysUntilExpiration <= rule.daysUntilExpiration);

      if (!applicableRule) continue;

      // Проверяем текущую скидку
      const currentDiscount = product.pricing.discounts.find(
        (d) => d.reason === DiscountReason.EXPIRATION,
      );

      if (
        !currentDiscount ||
        (currentDiscount.type === DiscountType.PERCENT &&
          currentDiscount.value < applicableRule.discountPercent)
      ) {
        results.push({
          product,
          requiredDiscount: applicableRule.discountPercent,
        });
      }
    }

    return results;
  }

  async getPricingConfig(
    query: Queries.GetPricingConfigQuery,
  ): Promise<PricingConfig | null> {
    return this.configs.get(query.sellerId.toString()) || null;
  }

  async getPriceHistory(
    query: Queries.GetPriceHistoryQuery,
  ): Promise<
    Array<{
      date: Date;
      oldPrice: number;
      newPrice: number;
      reason: string;
    }>
  > {
    // В текущей реализации история не хранится
    // Расширение: добавить коллекцию price_history
    return [];
  }

  simulatePrice(query: Queries.SimulatePriceQuery): PriceCalculation {
    const { data } = query;

    let totalDiscount = 0;
    const appliedDiscounts: AppliedDiscount[] = [];

    if (data.discounts) {
      for (const discount of data.discounts) {
        let amount = 0;
        if (discount.type === 'PERCENT') {
          amount = (data.basePrice * discount.value) / 100;
        } else {
          amount = discount.value;
        }

        appliedDiscounts.push({
          type: discount.type as DiscountType,
          value: discount.value,
          reason: DiscountReason.MANUAL,
          amount,
        });
        totalDiscount += amount;
      }
    }

    const finalPricePerUnit = Math.max(0, data.basePrice - totalDiscount);
    const finalPrice = finalPricePerUnit * data.quantity;

    return {
      basePrice: data.basePrice * data.quantity,
      basePricePerUnit: data.basePrice,
      quantity: data.quantity,
      channel: data.channel,
      discounts: appliedDiscounts,
      totalDiscount: totalDiscount * data.quantity,
      finalPrice,
      finalPricePerUnit,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private calculateMarginInfo(
    purchasePrice: number,
    sellingPrice: number,
  ): MarginInfo {
    const marginAbsolute = sellingPrice - purchasePrice;
    const marginPercent =
      purchasePrice > 0 ? (marginAbsolute / purchasePrice) * 100 : 0;

    let status: MarginStatus;
    if (marginPercent < 0) {
      status = MarginStatus.UNPROFITABLE;
    } else if (marginPercent < DEFAULT_MIN_MARGIN_PERCENT) {
      status = MarginStatus.LOW_MARGIN;
    } else {
      status = MarginStatus.PROFITABLE;
    }

    return {
      purchasePrice,
      sellingPrice,
      marginAbsolute,
      marginPercent,
      status,
    };
  }
}
