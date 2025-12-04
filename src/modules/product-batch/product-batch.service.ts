import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateResult, Types, FilterQuery } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainError } from 'src/common/errors';
import { ProductBatch, ProductBatchModel } from './product-batch.schema';
import { ProductBatchPort, BatchStatistics } from './product-batch.port';
import { ProductBatchStatus, ExpirationAlertLevel } from './product-batch.enums';
import * as ProductBatchCommands from './product-batch.commands';
import * as ProductBatchQueries from './product-batch.queries';

@Injectable()
export class ProductBatchService implements ProductBatchPort {
  constructor(
    @InjectModel(ProductBatch.name) private readonly batchModel: ProductBatchModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getProductBatch(
    query: ProductBatchQueries.GetProductBatchQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch | null> {
    return this.batchModel
      .findById(query.batchId)
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getProductBatchByNumber(
    query: ProductBatchQueries.GetProductBatchByNumberQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch | null> {
    return this.batchModel
      .findOne({
        seller: new Types.ObjectId(query.sellerId),
        batchNumber: query.batchNumber,
      })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getProductBatches(
    query: ProductBatchQueries.GetProductBatchesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'expirationDate'>,
  ): Promise<PaginateResult<ProductBatch>> {
    const filter: FilterQuery<ProductBatch> = {};

    if (query.filters.sellerId) {
      filter.seller = new Types.ObjectId(query.filters.sellerId);
    }
    if (query.filters.productId) {
      filter.product = new Types.ObjectId(query.filters.productId);
    }
    if (query.filters.status) {
      filter.status = query.filters.status;
    }
    if (query.filters.supplier) {
      filter.supplier = { $regex: query.filters.supplier, $options: 'i' };
    }
    if (query.filters.expiringWithinDays) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + query.filters.expiringWithinDays);
      filter.expirationDate = { $lte: threshold, $gte: new Date() };
      filter.status = ProductBatchStatus.ACTIVE;
    }

    // Фильтр по уровню алерта
    if (query.filters.alertLevel) {
      const now = new Date();
      switch (query.filters.alertLevel) {
        case ExpirationAlertLevel.EXPIRED:
          filter.expirationDate = { $lt: now };
          break;
        case ExpirationAlertLevel.CRITICAL:
          const critical = new Date();
          critical.setDate(critical.getDate() + 3);
          filter.expirationDate = { $gte: now, $lte: critical };
          break;
        case ExpirationAlertLevel.WARNING:
          const warningStart = new Date();
          warningStart.setDate(warningStart.getDate() + 3);
          const warningEnd = new Date();
          warningEnd.setDate(warningEnd.getDate() + 7);
          filter.expirationDate = { $gt: warningStart, $lte: warningEnd };
          break;
        case ExpirationAlertLevel.NORMAL:
          const normal = new Date();
          normal.setDate(normal.getDate() + 7);
          filter.expirationDate = { $gt: normal };
          break;
      }
    }

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 20;
    const sort = queryOptions?.sort || { expirationDate: 1 }; // FIFO по умолчанию

    return this.batchModel.paginate(filter, {
      page,
      limit,
      sort,
      lean: true,
      leanWithId: false,
      populate: { path: 'product', select: 'productName category' },
    });
  }

  async getActiveBatchesForProduct(
    query: ProductBatchQueries.GetActiveBatchesForProductQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch[]> {
    return this.batchModel
      .find({
        seller: new Types.ObjectId(query.sellerId),
        product: new Types.ObjectId(query.productId),
        status: ProductBatchStatus.ACTIVE,
        expirationDate: { $gte: new Date() },
      })
      .sort({ expirationDate: 1 }) // FIFO — сначала то, что раньше истекает
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getExpiringSoonBatches(
    query: ProductBatchQueries.GetExpiringSoonBatchesQuery,
    queryOptions?: CommonListQueryOptions<'expirationDate'>,
  ): Promise<PaginateResult<ProductBatch>> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + query.daysThreshold);

    const filter: FilterQuery<ProductBatch> = {
      seller: new Types.ObjectId(query.sellerId),
      status: ProductBatchStatus.ACTIVE,
      expirationDate: { $gte: new Date(), $lte: threshold },
    };

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 50;

    return this.batchModel.paginate(filter, {
      page,
      limit,
      sort: { expirationDate: 1 },
      lean: true,
      populate: { path: 'product', select: 'productName category' },
    });
  }

  async getBatchStatistics(
    query: ProductBatchQueries.GetBatchStatisticsQuery,
  ): Promise<BatchStatistics> {
    const matchFilter: any = {
      seller: new Types.ObjectId(query.sellerId),
    };

    if (query.productId) {
      matchFilter.product = new Types.ObjectId(query.productId);
    }
    if (query.dateFrom || query.dateTo) {
      matchFilter.createdAt = {};
      if (query.dateFrom) matchFilter.createdAt.$gte = query.dateFrom;
      if (query.dateTo) matchFilter.createdAt.$lte = query.dateTo;
    }

    const now = new Date();
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const result = await this.batchModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          activeBatches: {
            $sum: { $cond: [{ $eq: ['$status', ProductBatchStatus.ACTIVE] }, 1, 0] },
          },
          expiredBatches: {
            $sum: { $cond: [{ $eq: ['$status', ProductBatchStatus.EXPIRED] }, 1, 0] },
          },
          blockedBatches: {
            $sum: { $cond: [{ $eq: ['$status', ProductBatchStatus.BLOCKED] }, 1, 0] },
          },
          expiringWithin7Days: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', ProductBatchStatus.ACTIVE] },
                    { $gte: ['$expirationDate', now] },
                    { $lte: ['$expirationDate', in7Days] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          expiringWithin3Days: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', ProductBatchStatus.ACTIVE] },
                    { $gte: ['$expirationDate', now] },
                    { $lte: ['$expirationDate', in3Days] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalInitialQuantity: { $sum: '$initialQuantity' },
          avgShelfLife: {
            $avg: {
              $divide: [
                { $subtract: ['$expirationDate', '$productionDate'] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
      },
    ]);

    if (!result.length) {
      return {
        totalBatches: 0,
        activeBatches: 0,
        expiredBatches: 0,
        blockedBatches: 0,
        expiringWithin7Days: 0,
        expiringWithin3Days: 0,
        totalInitialQuantity: 0,
        averageShelfLifeDays: 0,
      };
    }

    return {
      totalBatches: result[0].totalBatches,
      activeBatches: result[0].activeBatches,
      expiredBatches: result[0].expiredBatches,
      blockedBatches: result[0].blockedBatches,
      expiringWithin7Days: result[0].expiringWithin7Days,
      expiringWithin3Days: result[0].expiringWithin3Days,
      totalInitialQuantity: result[0].totalInitialQuantity,
      averageShelfLifeDays: Math.round(result[0].avgShelfLife || 0),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createProductBatch(
    command: ProductBatchCommands.CreateProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch> {
    const { data } = command;

    // Проверяем уникальность номера партии
    const existing = await this.batchModel.findOne({
      seller: new Types.ObjectId(data.sellerId),
      batchNumber: data.batchNumber,
    }).session(options?.session || null);

    if (existing) {
      throw DomainError.validation('Партия с таким номером уже существует', {
        batchNumber: data.batchNumber,
      });
    }

    const batch = new this.batchModel({
      seller: new Types.ObjectId(data.sellerId),
      product: new Types.ObjectId(data.productId),
      batchNumber: data.batchNumber,
      expirationDate: data.expirationDate,
      initialQuantity: data.initialQuantity,
      productionDate: data.productionDate,
      supplier: data.supplier,
      supplierInvoice: data.supplierInvoice,
      purchasePrice: data.purchasePrice,
      externalCode: data.externalCode,
      comment: data.comment,
      status: ProductBatchStatus.ACTIVE,
    });

    const saved = await batch.save({ session: options?.session });
    return saved.toObject({ virtuals: true });
  }

  async updateProductBatch(
    command: ProductBatchCommands.UpdateProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch> {
    const { batchId, data } = command;

    const updated = await this.batchModel
      .findByIdAndUpdate(batchId, { $set: data }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('ProductBatch', batchId);
    }

    return updated;
  }

  async updateProductBatchStatus(
    command: ProductBatchCommands.UpdateProductBatchStatusCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch> {
    const { batchId, status, reason } = command;

    const update: any = { status };
    if (status === ProductBatchStatus.BLOCKED && reason) {
      update.blockReason = reason;
    }
    if (status !== ProductBatchStatus.BLOCKED) {
      update.blockReason = null;
    }

    const updated = await this.batchModel
      .findByIdAndUpdate(batchId, { $set: update }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('ProductBatch', batchId);
    }

    return updated;
  }

  async blockProductBatch(
    command: ProductBatchCommands.BlockProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch> {
    return this.updateProductBatchStatus(
      new ProductBatchCommands.UpdateProductBatchStatusCommand(
        command.batchId,
        ProductBatchStatus.BLOCKED,
        command.reason,
      ),
      options,
    );
  }

  async unblockProductBatch(
    command: ProductBatchCommands.UnblockProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch> {
    return this.updateProductBatchStatus(
      new ProductBatchCommands.UpdateProductBatchStatusCommand(
        command.batchId,
        ProductBatchStatus.ACTIVE,
      ),
      options,
    );
  }

  async expireProductBatches(
    command: ProductBatchCommands.ExpireProductBatchesCommand,
    options?: CommonCommandOptions,
  ): Promise<number> {
    const filter: FilterQuery<ProductBatch> = {
      status: ProductBatchStatus.ACTIVE,
      expirationDate: { $lt: new Date() },
    };

    if (command.sellerId) {
      filter.seller = new Types.ObjectId(command.sellerId);
    }

    const result = await this.batchModel.updateMany(
      filter,
      { $set: { status: ProductBatchStatus.EXPIRED } },
      { session: options?.session },
    );

    return result.modifiedCount;
  }
}
