import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  ProductTemplate,
  ProductTemplateModel,
} from './product-template.schema';
import { ProductTemplatePort } from './product-template.port';
import { ProductTemplateStatus } from './product-template.enums';
import * as Commands from './product-template.commands';
import * as Queries from './product-template.queries';

@Injectable()
export class ProductTemplateService implements ProductTemplatePort {
  constructor(
    @InjectModel(ProductTemplate.name)
    private readonly templateModel: ProductTemplateModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(
    command: Commands.CreateProductTemplateCommand,
  ): Promise<ProductTemplate> {
    const { data } = command;

    const template = new this.templateModel({
      seller: new Types.ObjectId(data.seller.toString()),
      product: new Types.ObjectId(data.product.toString()),
      productName: data.productName,
      category: data.category
        ? new Types.ObjectId(data.category.toString())
        : undefined,
      unit: data.unit,
      storageSettings: data.storageSettings || {},
      pricingSettings: data.pricingSettings || {},
      toleranceSettings: data.toleranceSettings || {},
      barcodes: data.barcodes || [],
      sku: data.sku,
      defaultSuppliers: data.defaultSuppliers || [],
      notes: data.notes,
    });

    return template.save();
  }

  async update(
    command: Commands.UpdateProductTemplateCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: command.data },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async updateStorageSettings(
    command: Commands.UpdateStorageSettingsCommand,
  ): Promise<ProductTemplate> {
    const updates: any = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updates[`storageSettings.${key}`] = value;
      }
    }

    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: updates },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async updatePricingSettings(
    command: Commands.UpdatePricingSettingsCommand,
  ): Promise<ProductTemplate> {
    const updates: any = {};
    for (const [key, value] of Object.entries(command.data)) {
      if (value !== undefined) {
        updates[`pricingSettings.${key}`] = value;
      }
    }

    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: updates },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async updateToleranceSettings(
    command: Commands.UpdateToleranceSettingsCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: { 'toleranceSettings.weightTolerance': command.data.weightTolerance } },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async updateStatus(
    command: Commands.UpdateProductTemplateStatusCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: { status: command.status } },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async addBarcode(
    command: Commands.AddBarcodeCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $addToSet: { barcodes: command.barcode } },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async removeBarcode(
    command: Commands.RemoveBarcodeCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $pull: { barcodes: command.barcode } },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  async archive(
    command: Commands.ArchiveProductTemplateCommand,
  ): Promise<ProductTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      command.templateId,
      { $set: { status: ProductTemplateStatus.ARCHIVED } },
      { new: true },
    );

    if (!template) {
      throw new Error(`ProductTemplate ${command.templateId} not found`);
    }

    return template;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetProductTemplateByIdQuery,
  ): Promise<ProductTemplate | null> {
    return this.templateModel.findById(query.templateId);
  }

  async getByProduct(
    query: Queries.GetProductTemplateByProductQuery,
  ): Promise<ProductTemplate | null> {
    return this.templateModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      product: new Types.ObjectId(query.productId.toString()),
    });
  }

  async getBySeller(
    query: Queries.GetProductTemplatesBySellerQuery,
  ): Promise<{ items: ProductTemplate[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.category) {
      filter.category = new Types.ObjectId(query.data.category.toString());
    }

    if (query.data.unit) {
      filter.unit = query.data.unit;
    }

    const [items, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort({ productName: 1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.templateModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async search(
    query: Queries.SearchProductTemplatesQuery,
  ): Promise<{ items: ProductTemplate[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$text = { $search: query.data.search };
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.category) {
      filter.category = new Types.ObjectId(query.data.category.toString());
    }

    if (query.data.hasBarcode !== undefined) {
      filter.barcodes = query.data.hasBarcode
        ? { $exists: true, $ne: [] }
        : { $size: 0 };
    }

    const [items, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort({ productName: 1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.templateModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getByBarcode(
    query: Queries.GetProductTemplateByBarcodeQuery,
  ): Promise<ProductTemplate | null> {
    return this.templateModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      barcodes: query.barcode,
    });
  }

  async getBySku(
    query: Queries.GetProductTemplateBySkuQuery,
  ): Promise<ProductTemplate | null> {
    return this.templateModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      sku: query.sku,
    });
  }

  async count(query: Queries.CountProductTemplatesQuery): Promise<number> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    return this.templateModel.countDocuments(filter);
  }
}
