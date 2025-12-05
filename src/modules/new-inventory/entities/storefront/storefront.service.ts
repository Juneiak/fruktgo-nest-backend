import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  Storefront,
  StorefrontModel,
  StorefrontProduct,
} from './storefront.schema';
import {
  StorefrontPort,
  PriceCalculation,
  StorefrontStatistics,
} from './storefront.port';
import {
  StorefrontProductStatus,
  DiscountType,
} from './storefront.enums';
import * as Commands from './storefront.commands';
import * as Queries from './storefront.queries';

@Injectable()
export class StorefrontService implements StorefrontPort {
  constructor(
    @InjectModel(Storefront.name)
    private readonly storefrontModel: StorefrontModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateStorefrontCommand): Promise<Storefront> {
    const { data } = command;

    const storefront = new this.storefrontModel({
      seller: new Types.ObjectId(data.seller.toString()),
      shop: new Types.ObjectId(data.shop.toString()),
      shopName: data.shopName,
      products: [],
      totalProducts: 0,
      activeProducts: 0,
    });

    return storefront.save();
  }

  async addProduct(command: Commands.AddProductCommand): Promise<Storefront> {
    const { data } = command;

    const product = {
      _id: new Types.ObjectId(),
      product: new Types.ObjectId(data.product.toString()),
      productTemplate: data.productTemplate
        ? new Types.ObjectId(data.productTemplate.toString())
        : undefined,
      productName: data.productName,
      category: data.category
        ? new Types.ObjectId(data.category.toString())
        : undefined,
      pricing: {
        onlinePrice: data.pricing.onlinePrice,
        offlinePrice: data.pricing.offlinePrice,
        purchasePrice: data.pricing.purchasePrice,
        discounts: [],
        finalOnlinePrice: data.pricing.onlinePrice,
        finalOfflinePrice: data.pricing.offlinePrice,
      },
      stockQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      isVisible: true,
      addedAt: new Date(),
    };

    const storefront = await this.storefrontModel.findByIdAndUpdate(
      command.storefrontId,
      {
        $push: { products: product },
        $inc: { totalProducts: 1, activeProducts: 1 },
      },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront ${command.storefrontId} not found`);
    }

    return storefront;
  }

  async updateProductPricing(
    command: Commands.UpdateProductPricingCommand,
  ): Promise<Storefront> {
    const updates: any = {};

    if (command.data.onlinePrice !== undefined) {
      updates['products.$.pricing.onlinePrice'] = command.data.onlinePrice;
    }
    if (command.data.offlinePrice !== undefined) {
      updates['products.$.pricing.offlinePrice'] = command.data.offlinePrice;
    }
    if (command.data.purchasePrice !== undefined) {
      updates['products.$.pricing.purchasePrice'] = command.data.purchasePrice;
    }

    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $set: updates },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    // Пересчёт finalPrice
    return this.recalculateFinalPrices(storefront, command.productId);
  }

  async updateProductVisibility(
    command: Commands.UpdateProductVisibilityCommand,
  ): Promise<Storefront> {
    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $set: { 'products.$.isVisible': command.isVisible } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    return storefront;
  }

  async updateProductStatus(
    command: Commands.UpdateProductStatusCommand,
  ): Promise<Storefront> {
    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $set: { 'products.$.status': command.status } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    // Обновляем счётчики
    await this.updateCounters(storefront._id);

    return this.storefrontModel.findById(storefront._id) as Promise<Storefront>;
  }

  async applyDiscount(command: Commands.ApplyDiscountCommand): Promise<Storefront> {
    const discount = {
      type: command.data.type,
      value: command.data.value,
      reason: command.data.reason,
      startDate: command.data.startDate,
      endDate: command.data.endDate,
      description: command.data.description,
      appliedBy: command.data.appliedBy
        ? new Types.ObjectId(command.data.appliedBy.toString())
        : undefined,
      appliedAt: new Date(),
    };

    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $push: { 'products.$.pricing.discounts': discount } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    return this.recalculateFinalPrices(storefront, command.productId);
  }

  async removeDiscount(command: Commands.RemoveDiscountCommand): Promise<Storefront> {
    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $pull: { 'products.$.pricing.discounts': { reason: command.reason } } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    return this.recalculateFinalPrices(storefront, command.productId);
  }

  async clearDiscounts(command: Commands.ClearDiscountsCommand): Promise<Storefront> {
    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $set: { 'products.$.pricing.discounts': [] } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    return this.recalculateFinalPrices(storefront, command.productId);
  }

  async syncProductStock(
    command: Commands.SyncProductStockCommand,
  ): Promise<Storefront> {
    const { data } = command;
    const availableQuantity = data.stockQuantity - data.reservedQuantity;

    const updates: any = {
      'products.$.stockQuantity': data.stockQuantity,
      'products.$.reservedQuantity': data.reservedQuantity,
      'products.$.availableQuantity': availableQuantity,
    };

    if (data.nearestExpirationDate) {
      updates['products.$.nearestExpirationDate'] = data.nearestExpirationDate;
    }
    if (data.averageFreshness !== undefined) {
      updates['products.$.averageFreshness'] = data.averageFreshness;
    }

    // Автоматически менять статус при отсутствии остатка
    if (availableQuantity <= 0) {
      updates['products.$.status'] = StorefrontProductStatus.OUT_OF_STOCK;
    }

    const storefront = await this.storefrontModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(command.storefrontId.toString()),
        'products.product': new Types.ObjectId(command.productId.toString()),
      },
      { $set: updates },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront or product not found`);
    }

    return storefront;
  }

  async removeProduct(command: Commands.RemoveProductCommand): Promise<Storefront> {
    const storefront = await this.storefrontModel.findByIdAndUpdate(
      command.storefrontId,
      {
        $pull: {
          products: { product: new Types.ObjectId(command.productId.toString()) },
        },
      },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront ${command.storefrontId} not found`);
    }

    await this.updateCounters(storefront._id);

    return this.storefrontModel.findById(storefront._id) as Promise<Storefront>;
  }

  async updateStatus(
    command: Commands.UpdateStorefrontStatusCommand,
  ): Promise<Storefront> {
    const storefront = await this.storefrontModel.findByIdAndUpdate(
      command.storefrontId,
      { $set: { status: command.status } },
      { new: true },
    );

    if (!storefront) {
      throw new Error(`Storefront ${command.storefrontId} not found`);
    }

    return storefront;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetStorefrontByIdQuery,
  ): Promise<Storefront | null> {
    return this.storefrontModel.findById(query.storefrontId);
  }

  async getByShop(
    query: Queries.GetStorefrontByShopQuery,
  ): Promise<Storefront | null> {
    return this.storefrontModel.findOne({
      shop: new Types.ObjectId(query.shopId.toString()),
    });
  }

  async getBySeller(
    query: Queries.GetStorefrontsBySellerQuery,
  ): Promise<{ items: Storefront[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    const [items, total] = await Promise.all([
      this.storefrontModel
        .find(filter)
        .sort({ shopName: 1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.storefrontModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getProducts(
    query: Queries.GetStorefrontProductsQuery,
  ): Promise<{ items: StorefrontProduct[]; total: number }> {
    const storefront = await this.storefrontModel.findById(
      query.data.storefrontId,
    );

    if (!storefront) {
      return { items: [], total: 0 };
    }

    let products = [...storefront.products];

    // Фильтрация
    if (query.data.status) {
      const statuses = Array.isArray(query.data.status)
        ? query.data.status
        : [query.data.status];
      products = products.filter((p) => statuses.includes(p.status));
    }

    if (query.data.category) {
      const catId = query.data.category.toString();
      products = products.filter((p) => p.category?.toHexString() === catId);
    }

    if (query.data.isVisible !== undefined) {
      products = products.filter((p) => p.isVisible === query.data.isVisible);
    }

    if (query.data.hasDiscount) {
      products = products.filter((p) => p.pricing.discounts.length > 0);
    }

    if (query.data.inStock) {
      products = products.filter((p) => p.availableQuantity > 0);
    }

    if (query.data.search) {
      const search = query.data.search.toLowerCase();
      products = products.filter((p) =>
        p.productName.toLowerCase().includes(search),
      );
    }

    const total = products.length;
    const offset = query.data.offset || 0;
    const limit = query.data.limit || 50;
    const items = products.slice(offset, offset + limit);

    return { items, total };
  }

  async getProduct(
    query: Queries.GetStorefrontProductQuery,
  ): Promise<StorefrontProduct | null> {
    const storefront = await this.storefrontModel.findById(query.storefrontId);
    if (!storefront) return null;

    return (
      storefront.products.find(
        (p) => p.product.toHexString() === query.productId.toString(),
      ) || null
    );
  }

  async calculateFinalPrice(
    query: Queries.CalculateFinalPriceQuery,
  ): Promise<PriceCalculation> {
    const product = await this.getProduct(
      new Queries.GetStorefrontProductQuery(
        query.data.storefrontId,
        query.data.productId,
      ),
    );

    if (!product) {
      throw new Error('Product not found');
    }

    const basePrice =
      query.data.channel === 'online'
        ? product.pricing.onlinePrice
        : product.pricing.offlinePrice;

    const discounts: PriceCalculation['discounts'] = [];
    let totalDiscount = 0;

    // Применяем скидки (только для онлайн)
    if (query.data.channel === 'online') {
      const now = new Date();
      for (const discount of product.pricing.discounts) {
        // Проверяем даты
        if (discount.startDate && discount.startDate > now) continue;
        if (discount.endDate && discount.endDate < now) continue;

        let amount = 0;
        if (discount.type === DiscountType.PERCENT) {
          amount = (basePrice * discount.value) / 100;
        } else {
          amount = discount.value;
        }

        discounts.push({
          type: discount.type,
          value: discount.value,
          reason: discount.reason,
          amount,
        });
        totalDiscount += amount;
      }
    }

    const finalPricePerUnit = Math.max(0, basePrice - totalDiscount);
    const finalPrice = finalPricePerUnit * query.data.quantity;

    return {
      basePrice: basePrice * query.data.quantity,
      discounts,
      totalDiscount: totalDiscount * query.data.quantity,
      finalPrice,
      finalPricePerUnit,
    };
  }

  async getProductsWithExpiringDiscounts(
    query: Queries.GetProductsWithExpiringDiscountsQuery,
  ): Promise<StorefrontProduct[]> {
    const storefront = await this.storefrontModel.findById(
      query.data.storefrontId,
    );
    if (!storefront) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + query.data.withinDays);

    return storefront.products.filter((p) =>
      p.pricing.discounts.some(
        (d) => d.endDate && d.endDate <= cutoff && d.endDate > new Date(),
      ),
    );
  }

  async getStatistics(
    query: Queries.GetStorefrontStatisticsQuery,
  ): Promise<StorefrontStatistics> {
    const storefront = await this.storefrontModel.findById(query.storefrontId);
    if (!storefront) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        hiddenProducts: 0,
        outOfStockProducts: 0,
        productsWithDiscount: 0,
        averageDiscount: 0,
        totalStockValue: 0,
      };
    }

    const products = storefront.products;
    let totalStockValue = 0;
    let totalDiscount = 0;
    let discountCount = 0;

    const stats = {
      totalProducts: products.length,
      activeProducts: 0,
      hiddenProducts: 0,
      outOfStockProducts: 0,
      productsWithDiscount: 0,
      averageDiscount: 0,
      totalStockValue: 0,
    };

    for (const p of products) {
      if (p.status === StorefrontProductStatus.ACTIVE) stats.activeProducts++;
      if (!p.isVisible) stats.hiddenProducts++;
      if (p.status === StorefrontProductStatus.OUT_OF_STOCK)
        stats.outOfStockProducts++;
      if (p.pricing.discounts.length > 0) {
        stats.productsWithDiscount++;
        for (const d of p.pricing.discounts) {
          if (d.type === DiscountType.PERCENT) {
            totalDiscount += d.value;
            discountCount++;
          }
        }
      }
      if (p.pricing.purchasePrice) {
        totalStockValue += p.pricing.purchasePrice * p.stockQuantity;
      }
    }

    stats.averageDiscount = discountCount > 0 ? totalDiscount / discountCount : 0;
    stats.totalStockValue = totalStockValue;

    return stats;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async recalculateFinalPrices(
    storefront: Storefront,
    productId: Types.ObjectId | string,
  ): Promise<Storefront> {
    const product = storefront.products.find(
      (p) => p.product.toHexString() === productId.toString(),
    );
    if (!product) return storefront;

    let onlineDiscount = 0;
    const now = new Date();

    for (const discount of product.pricing.discounts) {
      if (discount.startDate && discount.startDate > now) continue;
      if (discount.endDate && discount.endDate < now) continue;

      if (discount.type === DiscountType.PERCENT) {
        onlineDiscount += (product.pricing.onlinePrice * discount.value) / 100;
      } else {
        onlineDiscount += discount.value;
      }
    }

    const finalOnlinePrice = Math.max(
      0,
      product.pricing.onlinePrice - onlineDiscount,
    );

    await this.storefrontModel.updateOne(
      {
        _id: storefront._id,
        'products.product': new Types.ObjectId(productId.toString()),
      },
      {
        $set: {
          'products.$.pricing.finalOnlinePrice': finalOnlinePrice,
          'products.$.pricing.finalOfflinePrice': product.pricing.offlinePrice,
        },
      },
    );

    return this.storefrontModel.findById(storefront._id) as Promise<Storefront>;
  }

  private async updateCounters(storefrontId: Types.ObjectId): Promise<void> {
    const storefront = await this.storefrontModel.findById(storefrontId);
    if (!storefront) return;

    const totalProducts = storefront.products.length;
    const activeProducts = storefront.products.filter(
      (p) => p.status === StorefrontProductStatus.ACTIVE,
    ).length;

    await this.storefrontModel.updateOne(
      { _id: storefrontId },
      { $set: { totalProducts, activeProducts } },
    );
  }
}
