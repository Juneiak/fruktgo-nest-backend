import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  InventoryProduct,
  InventoryProductModel,
} from './inventory-product.schema';
import { InventoryProductPort } from './inventory-product.port';
import { InventoryProductStatus, ShelfLifeType } from './inventory-product.enums';
import * as Commands from './inventory-product.commands';
import * as Queries from './inventory-product.queries';

@Injectable()
export class InventoryProductService implements InventoryProductPort {
  constructor(
    @InjectModel(InventoryProduct.name)
    private readonly productModel: InventoryProductModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(
    command: Commands.CreateInventoryProductCommand,
  ): Promise<InventoryProduct> {
    const { data } = command;

    const product = new this.productModel({
      seller: new Types.ObjectId(data.seller.toString()),
      name: data.name,
      description: data.description,
      sku: data.sku,
      barcodes: data.barcodes || [],
      category: data.category,
      subcategory: data.subcategory,
      unit: data.unit,
      unitWeight: data.unitWeight,
      origin: data.origin,
      countryOfOrigin: data.countryOfOrigin,
      storageRequirements: data.storageRequirements || {},
      shelfLife: data.shelfLife,
      shrinkage: data.shrinkage || {},
      tolerance: data.tolerance || {},
      imageUrl: data.imageUrl,
      gallery: data.gallery || [],
      masterProduct: data.masterProduct
        ? new Types.ObjectId(data.masterProduct.toString())
        : undefined,
      tags: data.tags || [],
      attributes: data.attributes,
      status: InventoryProductStatus.ACTIVE,
      isActive: true,
    });

    return product.save();
  }

  async update(
    command: Commands.UpdateInventoryProductCommand,
  ): Promise<InventoryProduct> {
    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: command.data },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async updateStorageRequirements(
    command: Commands.UpdateStorageRequirementsCommand,
  ): Promise<InventoryProduct> {
    const updateObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updateObj[`storageRequirements.${key}`] = value;
      }
    }

    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: updateObj },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async updateShelfLifeSettings(
    command: Commands.UpdateShelfLifeSettingsCommand,
  ): Promise<InventoryProduct> {
    const updateObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updateObj[`shelfLife.${key}`] = value;
      }
    }

    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: updateObj },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async updateShrinkageSettings(
    command: Commands.UpdateShrinkageSettingsCommand,
  ): Promise<InventoryProduct> {
    const updateObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updateObj[`shrinkage.${key}`] = value;
      }
    }

    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: updateObj },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async updateToleranceSettings(
    command: Commands.UpdateToleranceSettingsCommand,
  ): Promise<InventoryProduct> {
    const updateObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updateObj[`tolerance.${key}`] = value;
      }
    }

    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: updateObj },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async changeStatus(
    command: Commands.ChangeProductStatusCommand,
  ): Promise<InventoryProduct> {
    const isActive = command.status !== InventoryProductStatus.ARCHIVED;

    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $set: { status: command.status, isActive } },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async addBarcode(command: Commands.AddBarcodeCommand): Promise<InventoryProduct> {
    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $addToSet: { barcodes: command.barcode } },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async removeBarcode(command: Commands.RemoveBarcodeCommand): Promise<InventoryProduct> {
    const product = await this.productModel.findByIdAndUpdate(
      command.productId,
      { $pull: { barcodes: command.barcode } },
      { new: true },
    );

    if (!product) {
      throw new Error(`Product ${command.productId} not found`);
    }

    return product;
  }

  async archive(command: Commands.ArchiveProductCommand): Promise<InventoryProduct> {
    return this.changeStatus(
      new Commands.ChangeProductStatusCommand(
        command.productId,
        InventoryProductStatus.ARCHIVED,
      ),
    );
  }

  async importFromMaster(
    command: Commands.ImportFromMasterProductCommand,
  ): Promise<InventoryProduct> {
    // Упрощённая реализация — в реальности нужно получить данные из мастер-каталога
    // и создать продукт с переопределениями
    throw new Error('Import from master not implemented — requires MasterProduct module');
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetProductByIdQuery): Promise<InventoryProduct | null> {
    return this.productModel.findById(query.productId);
  }

  async getBySku(query: Queries.GetProductBySkuQuery): Promise<InventoryProduct | null> {
    return this.productModel.findOne({
      seller: new Types.ObjectId(query.seller.toString()),
      sku: query.sku,
    });
  }

  async getByBarcode(
    query: Queries.GetProductByBarcodeQuery,
  ): Promise<InventoryProduct | null> {
    return this.productModel.findOne({
      seller: new Types.ObjectId(query.seller.toString()),
      barcodes: query.barcode,
    });
  }

  async getSellerProducts(
    query: Queries.GetSellerProductsQuery,
  ): Promise<{ items: InventoryProduct[]; total: number }> {
    const { data } = query;

    const filter: any = {
      seller: new Types.ObjectId(data.seller.toString()),
    };

    if (data.category) filter.category = data.category;
    if (data.shelfLifeType) filter['shelfLife.type'] = data.shelfLifeType;
    if (data.isActive !== undefined) filter.isActive = data.isActive;

    if (data.status) {
      filter.status = Array.isArray(data.status)
        ? { $in: data.status }
        : data.status;
    }

    if (data.search) {
      filter.$text = { $search: data.search };
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ name: 1 })
        .skip(data.offset || 0)
        .limit(data.limit || 50),
      this.productModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async search(query: Queries.SearchProductsQuery): Promise<InventoryProduct[]> {
    const { data } = query;

    const filter: any = {
      seller: new Types.ObjectId(data.seller.toString()),
      $text: { $search: data.query },
      isActive: true,
    };

    if (data.category) filter.category = data.category;

    return this.productModel
      .find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(data.limit || 20);
  }

  async getByCategory(
    query: Queries.GetProductsByCategoryQuery,
  ): Promise<{ items: InventoryProduct[]; total: number }> {
    const { data } = query;

    const filter = {
      seller: new Types.ObjectId(data.seller.toString()),
      category: data.category,
      isActive: true,
    };

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ name: 1 })
        .skip(data.offset || 0)
        .limit(data.limit || 50),
      this.productModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getPerishable(
    query: Queries.GetPerishableProductsQuery,
  ): Promise<InventoryProduct[]> {
    const maxDays = query.data.maxShelfLifeDays || 7;

    return this.productModel.find({
      seller: new Types.ObjectId(query.data.seller.toString()),
      'shelfLife.type': ShelfLifeType.PERISHABLE,
      'shelfLife.baseDays': { $lte: maxDays },
      isActive: true,
    });
  }

  async getShrinkable(
    query: Queries.GetShrinkableProductsQuery,
  ): Promise<InventoryProduct[]> {
    return this.productModel.find({
      seller: new Types.ObjectId(query.seller.toString()),
      'shrinkage.enabled': true,
      isActive: true,
    });
  }

  async getRefrigerated(
    query: Queries.GetRefrigeratedProductsQuery,
  ): Promise<InventoryProduct[]> {
    return this.productModel.find({
      seller: new Types.ObjectId(query.seller.toString()),
      'storageRequirements.requiresRefrigeration': true,
      isActive: true,
    });
  }

  async getByMaster(
    query: Queries.GetProductsByMasterQuery,
  ): Promise<InventoryProduct[]> {
    return this.productModel.find({
      masterProduct: new Types.ObjectId(query.masterProductId.toString()),
    });
  }

  async count(query: Queries.CountProductsQuery): Promise<number> {
    const { data } = query;

    const filter: any = {
      seller: new Types.ObjectId(data.seller.toString()),
    };

    if (data.category) filter.category = data.category;
    if (data.status) filter.status = data.status;
    if (data.isActive !== undefined) filter.isActive = data.isActive;

    return this.productModel.countDocuments(filter);
  }

  async isSkuUnique(query: Queries.CheckSkuUniqueQuery): Promise<boolean> {
    const filter: any = {
      seller: new Types.ObjectId(query.seller.toString()),
      sku: query.sku,
    };

    if (query.excludeProductId) {
      filter._id = { $ne: new Types.ObjectId(query.excludeProductId.toString()) };
    }

    const existing = await this.productModel.findOne(filter);
    return !existing;
  }

  async isBarcodeUnique(query: Queries.CheckBarcodeUniqueQuery): Promise<boolean> {
    const filter: any = {
      seller: new Types.ObjectId(query.seller.toString()),
      barcodes: query.barcode,
    };

    if (query.excludeProductId) {
      filter._id = { $ne: new Types.ObjectId(query.excludeProductId.toString()) };
    }

    const existing = await this.productModel.findOne(filter);
    return !existing;
  }
}
