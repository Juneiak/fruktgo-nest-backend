import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateResult, Types, FilterQuery } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainError } from 'src/common/errors';
import { WarehouseProduct, WarehouseProductModel } from './warehouse-product.schema';
import { WarehouseProductPort } from './warehouse-product.port';
import { WarehouseProductStatus } from './warehouse-product.enums';
import * as WarehouseProductCommands from './warehouse-product.commands';
import * as WarehouseProductQueries from './warehouse-product.queries';

@Injectable()
export class WarehouseProductService implements WarehouseProductPort {
  constructor(
    @InjectModel(WarehouseProduct.name) private readonly warehouseProductModel: WarehouseProductModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getWarehouseProduct(
    query: WarehouseProductQueries.GetWarehouseProductQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null> {
    return this.warehouseProductModel
      .findById(query.warehouseProductId)
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getWarehouseProductsByIds(
    query: WarehouseProductQueries.GetWarehouseProductsByIdsQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct[]> {
    return this.warehouseProductModel
      .find({ _id: { $in: query.warehouseProductIds.map(id => new Types.ObjectId(id)) } })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getWarehouseProducts(
    query: WarehouseProductQueries.GetWarehouseProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'stockQuantity'>,
  ): Promise<PaginateResult<WarehouseProduct>> {
    const filter: FilterQuery<WarehouseProduct> = {};

    if (query.filters.warehouseId) {
      filter.warehouse = new Types.ObjectId(query.filters.warehouseId);
    }
    if (query.filters.productId) {
      filter.product = new Types.ObjectId(query.filters.productId);
    }
    if (query.filters.status) {
      filter.status = query.filters.status;
    }
    if (query.filters.hasStock) {
      filter.stockQuantity = { $gt: 0 };
    }
    if (query.filters.belowMinStock) {
      filter.$expr = { $lt: ['$stockQuantity', '$minStockLevel'] };
    }

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 20;
    const sort = queryOptions?.sort || { createdAt: -1 };

    return this.warehouseProductModel.paginate(filter, {
      page,
      limit,
      sort,
      lean: true,
      leanWithId: false,
    });
  }

  async getWarehouseProductByProduct(
    query: WarehouseProductQueries.GetWarehouseProductByProductQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null> {
    return this.warehouseProductModel
      .findOne({
        warehouse: new Types.ObjectId(query.warehouseId),
        product: new Types.ObjectId(query.productId),
      })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getWarehouseProductByExternalCode(
    query: WarehouseProductQueries.GetWarehouseProductByExternalCodeQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null> {
    return this.warehouseProductModel
      .findOne({
        warehouse: new Types.ObjectId(query.warehouseId),
        externalCode: query.externalCode,
      })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getLowStockWarehouseProducts(
    query: WarehouseProductQueries.GetLowStockWarehouseProductsQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct[]> {
    return this.warehouseProductModel
      .find({
        warehouse: new Types.ObjectId(query.warehouseId),
        status: WarehouseProductStatus.ACTIVE,
        minStockLevel: { $gt: 0 },
        $expr: { $lt: ['$stockQuantity', '$minStockLevel'] },
      })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createWarehouseProduct(
    command: WarehouseProductCommands.CreateWarehouseProductCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { data } = command;

    const warehouseProduct = new this.warehouseProductModel({
      warehouse: new Types.ObjectId(data.warehouseId),
      product: new Types.ObjectId(data.productId),
      stockQuantity: data.stockQuantity || 0,
      reservedQuantity: 0,
      status: WarehouseProductStatus.ACTIVE,
      externalCode: data.externalCode,
      minStockLevel: data.minStockLevel || 0,
    });

    const saved = await warehouseProduct.save({ session: options?.session });
    return saved.toObject({ virtuals: true });
  }

  async updateWarehouseProduct(
    command: WarehouseProductCommands.UpdateWarehouseProductCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, data } = command;

    const update: any = {};
    if (data.externalCode !== undefined) update.externalCode = data.externalCode;
    if (data.minStockLevel !== undefined) update.minStockLevel = data.minStockLevel;
    if (data.status !== undefined) update.status = data.status;

    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(warehouseProductId, { $set: update }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    return updated;
  }

  async adjustStockQuantity(
    command: WarehouseProductCommands.AdjustStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, adjustment } = command;

    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(
        warehouseProductId,
        { $inc: { stockQuantity: adjustment } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    // Проверяем что остаток не ушёл в минус
    if (updated.stockQuantity < 0) {
      throw DomainError.validation('Недостаточно остатков на складе', {
        warehouseProductId,
        currentStock: updated.stockQuantity - adjustment,
        requestedAdjustment: adjustment,
      });
    }

    return updated;
  }

  async bulkAdjustStockQuantity(
    command: WarehouseProductCommands.BulkAdjustStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<void> {
    const bulkOps = command.adjustments.map(adj => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(adj.warehouseProductId) },
        update: { $inc: { stockQuantity: adj.adjustment } },
      },
    }));

    await this.warehouseProductModel.bulkWrite(bulkOps, { session: options?.session });
  }

  async setStockQuantity(
    command: WarehouseProductCommands.SetStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, quantity } = command;

    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(
        warehouseProductId,
        { $set: { stockQuantity: quantity } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    return updated;
  }

  async reserveStock(
    command: WarehouseProductCommands.ReserveStockCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, quantity } = command;

    // Проверяем доступность
    const product = await this.warehouseProductModel
      .findById(warehouseProductId)
      .session(options?.session || null);

    if (!product) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    const available = product.stockQuantity - product.reservedQuantity;
    if (available < quantity) {
      throw DomainError.validation('Недостаточно доступного остатка для резервирования', {
        warehouseProductId,
        available,
        requested: quantity,
      });
    }

    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(
        warehouseProductId,
        { $inc: { reservedQuantity: quantity } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    return updated!;
  }

  async releaseReserve(
    command: WarehouseProductCommands.ReleaseReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, quantity } = command;

    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(
        warehouseProductId,
        { $inc: { reservedQuantity: -quantity } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    return updated;
  }

  async confirmReserve(
    command: WarehouseProductCommands.ConfirmReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct> {
    const { warehouseProductId, quantity } = command;

    // Уменьшаем и резерв и остаток
    const updated = await this.warehouseProductModel
      .findByIdAndUpdate(
        warehouseProductId,
        { 
          $inc: { 
            reservedQuantity: -quantity,
            stockQuantity: -quantity,
          } 
        },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('WarehouseProduct', warehouseProductId);
    }

    return updated;
  }

  async bulkUpsertWarehouseProducts(
    command: WarehouseProductCommands.BulkUpsertWarehouseProductsCommand,
    options?: CommonCommandOptions,
  ): Promise<{ created: number; updated: number }> {
    const { warehouseId, items } = command;
    let created = 0;
    let updated = 0;

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: {
          warehouse: new Types.ObjectId(warehouseId),
          product: new Types.ObjectId(item.productId),
        },
        update: {
          $set: {
            stockQuantity: item.stockQuantity,
            ...(item.externalCode && { externalCode: item.externalCode }),
            ...(item.minStockLevel !== undefined && { minStockLevel: item.minStockLevel }),
          },
          $setOnInsert: {
            warehouse: new Types.ObjectId(warehouseId),
            product: new Types.ObjectId(item.productId),
            reservedQuantity: 0,
            status: WarehouseProductStatus.ACTIVE,
          },
        },
        upsert: true,
      },
    }));

    const result = await this.warehouseProductModel.bulkWrite(bulkOps, { session: options?.session });
    created = result.upsertedCount;
    updated = result.modifiedCount;

    return { created, updated };
  }
}
