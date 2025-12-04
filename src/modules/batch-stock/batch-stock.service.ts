import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateResult, Types, FilterQuery } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainError } from 'src/common/errors';
import { 
  ProductBatchPort, 
  PRODUCT_BATCH_PORT, 
  ProductBatchQueries,
  ProductBatchStatus,
} from 'src/modules/product-batch';
import { BatchStock, BatchStockModel } from './batch-stock.schema';
import { BatchStockPort, FifoConsumeResult } from './batch-stock.port';
import { BatchStockLocationType, BatchStockStatus } from './batch-stock.enums';
import * as BatchStockCommands from './batch-stock.commands';
import * as BatchStockQueries from './batch-stock.queries';

@Injectable()
export class BatchStockService implements BatchStockPort {
  constructor(
    @InjectModel(BatchStock.name) private readonly batchStockModel: BatchStockModel,
    @Inject(PRODUCT_BATCH_PORT) private readonly productBatchPort: ProductBatchPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getBatchStock(
    query: BatchStockQueries.GetBatchStockQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock | null> {
    return this.batchStockModel
      .findById(query.batchStockId)
      .populate('batch')
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getBatchStocksByBatch(
    query: BatchStockQueries.GetBatchStocksByBatchQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]> {
    return this.batchStockModel
      .find({ batch: new Types.ObjectId(query.batchId) })
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getBatchStocksByLocation(
    query: BatchStockQueries.GetBatchStocksByLocationQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<BatchStock>> {
    const filter: FilterQuery<BatchStock> = {
      locationType: query.filters.locationType,
    };

    if (query.filters.shopId) {
      filter.shop = new Types.ObjectId(query.filters.shopId);
    }
    if (query.filters.warehouseId) {
      filter.warehouse = new Types.ObjectId(query.filters.warehouseId);
    }
    if (query.filters.status) {
      filter.status = query.filters.status;
    }
    if (query.filters.hasStock) {
      filter.quantity = { $gt: 0 };
    }

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 50;

    return this.batchStockModel.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true,
      populate: { path: 'batch', select: 'batchNumber expirationDate product' },
    });
  }

  async getBatchStocksByShopProduct(
    query: BatchStockQueries.GetBatchStocksByShopProductQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]> {
    const filter: FilterQuery<BatchStock> = {
      shopProduct: new Types.ObjectId(query.shopProductId),
    };

    if (query.activeOnly) {
      filter.status = BatchStockStatus.ACTIVE;
      filter.quantity = { $gt: 0 };
    }

    return this.batchStockModel
      .find(filter)
      .populate('batch')
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getBatchStocksByWarehouseProduct(
    query: BatchStockQueries.GetBatchStocksByWarehouseProductQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]> {
    const filter: FilterQuery<BatchStock> = {
      warehouseProduct: new Types.ObjectId(query.warehouseProductId),
    };

    if (query.activeOnly) {
      filter.status = BatchStockStatus.ACTIVE;
      filter.quantity = { $gt: 0 };
    }

    return this.batchStockModel
      .find(filter)
      .populate('batch')
      .session(options?.session || null)
      .lean({ virtuals: true });
  }

  async getBatchStocksForFifo(
    query: BatchStockQueries.GetBatchStocksForFifoQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]> {
    const filter: FilterQuery<BatchStock> = {
      locationType: query.filters.locationType,
      status: BatchStockStatus.ACTIVE,
      quantity: { $gt: 0 },
    };

    if (query.filters.shopId) {
      filter.shop = new Types.ObjectId(query.filters.shopId);
    }
    if (query.filters.warehouseId) {
      filter.warehouse = new Types.ObjectId(query.filters.warehouseId);
    }
    if (query.filters.shopProductId) {
      filter.shopProduct = new Types.ObjectId(query.filters.shopProductId);
    }
    if (query.filters.warehouseProductId) {
      filter.warehouseProduct = new Types.ObjectId(query.filters.warehouseProductId);
    }

    // Получаем с populate batch для сортировки по expirationDate
    const stocks = await this.batchStockModel
      .find(filter)
      .populate({
        path: 'batch',
        match: { 
          status: ProductBatchStatus.ACTIVE,
          expirationDate: { $gte: new Date() },
        },
      })
      .session(options?.session || null)
      .lean({ virtuals: true });

    // Фильтруем те, где batch прошёл match и сортируем по expirationDate
    return stocks
      .filter(s => s.batch)
      .sort((a, b) => {
        const batchA = a.batch as any;
        const batchB = b.batch as any;
        return new Date(batchA.expirationDate).getTime() - new Date(batchB.expirationDate).getTime();
      });
  }

  async getExpiringBatchStocks(
    query: BatchStockQueries.GetExpiringBatchStocksQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<BatchStock>> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + query.filters.daysThreshold);

    const filter: FilterQuery<BatchStock> = {
      locationType: query.filters.locationType,
      status: BatchStockStatus.ACTIVE,
      quantity: { $gt: 0 },
    };

    if (query.filters.shopId) {
      filter.shop = new Types.ObjectId(query.filters.shopId);
    }
    if (query.filters.warehouseId) {
      filter.warehouse = new Types.ObjectId(query.filters.warehouseId);
    }

    const page = queryOptions?.pagination?.page || 1;
    const limit = queryOptions?.pagination?.pageSize || 50;

    // Нужен aggregation с lookup для фильтрации по expirationDate партии
    const result = await this.batchStockModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'productbatches',
          localField: 'batch',
          foreignField: '_id',
          as: 'batchData',
        },
      },
      { $unwind: '$batchData' },
      {
        $match: {
          'batchData.expirationDate': { $gte: new Date(), $lte: threshold },
          'batchData.status': ProductBatchStatus.ACTIVE,
        },
      },
      { $sort: { 'batchData.expirationDate': 1 } },
      {
        $facet: {
          docs: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalDocs: [{ $count: 'count' }],
        },
      },
    ]);

    const docs = result[0]?.docs || [];
    const totalDocs = result[0]?.totalDocs[0]?.count || 0;

    return {
      docs,
      totalDocs,
      limit,
      page,
      totalPages: Math.ceil(totalDocs / limit),
      hasNextPage: page * limit < totalDocs,
      hasPrevPage: page > 1,
      nextPage: page * limit < totalDocs ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      pagingCounter: (page - 1) * limit + 1,
      offset: (page - 1) * limit,
    };
  }

  async getTotalStockByBatch(
    query: BatchStockQueries.GetTotalStockByBatchQuery,
  ): Promise<number> {
    const result = await this.batchStockModel.aggregate([
      { $match: { batch: new Types.ObjectId(query.batchId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);

    return result[0]?.total || 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createBatchStock(
    command: BatchStockCommands.CreateBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    const { data } = command;

    const stock = new this.batchStockModel({
      batch: new Types.ObjectId(data.batchId),
      locationType: data.locationType,
      shop: data.shopId ? new Types.ObjectId(data.shopId) : undefined,
      warehouse: data.warehouseId ? new Types.ObjectId(data.warehouseId) : undefined,
      shopProduct: data.shopProductId ? new Types.ObjectId(data.shopProductId) : undefined,
      warehouseProduct: data.warehouseProductId ? new Types.ObjectId(data.warehouseProductId) : undefined,
      quantity: data.quantity,
      reservedQuantity: 0,
      status: BatchStockStatus.ACTIVE,
    });

    const saved = await stock.save({ session: options?.session });
    return saved.toObject({ virtuals: true });
  }

  async adjustBatchStock(
    command: BatchStockCommands.AdjustBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    const { batchStockId, adjustment } = command;

    const stock = await this.batchStockModel.findById(batchStockId);
    if (!stock) {
      throw DomainError.notFound('BatchStock', batchStockId);
    }

    const newQuantity = stock.quantity + adjustment;
    if (newQuantity < 0) {
      throw DomainError.validation('Недостаточно остатков партии', {
        current: stock.quantity,
        requested: Math.abs(adjustment),
      });
    }

    const update: any = { quantity: newQuantity };
    if (newQuantity === 0) {
      update.status = BatchStockStatus.DEPLETED;
    }

    const updated = await this.batchStockModel
      .findByIdAndUpdate(batchStockId, { $set: update }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    return updated!;
  }

  async reserveBatchStock(
    command: BatchStockCommands.ReserveBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    const { batchStockId, quantity } = command;

    const stock = await this.batchStockModel.findById(batchStockId);
    if (!stock) {
      throw DomainError.notFound('BatchStock', batchStockId);
    }

    const available = stock.quantity - stock.reservedQuantity;
    if (quantity > available) {
      throw DomainError.validation('Недостаточно доступного количества для резервирования', {
        available,
        requested: quantity,
      });
    }

    const updated = await this.batchStockModel
      .findByIdAndUpdate(
        batchStockId,
        { $inc: { reservedQuantity: quantity } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    return updated!;
  }

  async releaseBatchStockReserve(
    command: BatchStockCommands.ReleaseBatchStockReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    const { batchStockId, quantity } = command;

    const updated = await this.batchStockModel
      .findByIdAndUpdate(
        batchStockId,
        { $inc: { reservedQuantity: -quantity } },
        { new: true },
      )
      .session(options?.session || null)
      .lean({ virtuals: true });

    if (!updated) {
      throw DomainError.notFound('BatchStock', batchStockId);
    }

    return updated;
  }

  async confirmBatchStockReserve(
    command: BatchStockCommands.ConfirmBatchStockReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    const { batchStockId, quantity } = command;

    const stock = await this.batchStockModel.findById(batchStockId);
    if (!stock) {
      throw DomainError.notFound('BatchStock', batchStockId);
    }

    const newQuantity = stock.quantity - quantity;
    const newReserved = stock.reservedQuantity - quantity;

    const update: any = {
      quantity: Math.max(0, newQuantity),
      reservedQuantity: Math.max(0, newReserved),
    };

    if (newQuantity <= 0) {
      update.status = BatchStockStatus.DEPLETED;
    }

    const updated = await this.batchStockModel
      .findByIdAndUpdate(batchStockId, { $set: update }, { new: true })
      .session(options?.session || null)
      .lean({ virtuals: true });

    return updated!;
  }

  async transferBatchStock(
    command: BatchStockCommands.TransferBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<{ from: BatchStock; to: BatchStock }> {
    const { data } = command;

    // Находим исходный BatchStock
    const fromFilter: FilterQuery<BatchStock> = {
      batch: new Types.ObjectId(data.batchId),
      locationType: data.fromLocationType,
    };
    if (data.fromShopId) fromFilter.shop = new Types.ObjectId(data.fromShopId);
    if (data.fromWarehouseId) fromFilter.warehouse = new Types.ObjectId(data.fromWarehouseId);

    const fromStock = await this.batchStockModel.findOne(fromFilter);
    if (!fromStock) {
      throw DomainError.notFound('BatchStock', 'source location');
    }

    const available = fromStock.quantity - fromStock.reservedQuantity;
    if (data.quantity > available) {
      throw DomainError.validation('Недостаточно доступного количества для перемещения', {
        available,
        requested: data.quantity,
      });
    }

    // Уменьшаем в источнике
    const updatedFrom = await this.adjustBatchStock(
      new BatchStockCommands.AdjustBatchStockCommand(fromStock._id.toString(), -data.quantity),
      options,
    );

    // Ищем или создаём в назначении
    const toFilter: FilterQuery<BatchStock> = {
      batch: new Types.ObjectId(data.batchId),
      locationType: data.toLocationType,
    };
    if (data.toShopId) toFilter.shop = new Types.ObjectId(data.toShopId);
    if (data.toWarehouseId) toFilter.warehouse = new Types.ObjectId(data.toWarehouseId);

    let toStock = await this.batchStockModel.findOne(toFilter);

    if (toStock) {
      // Увеличиваем существующий
      const updatedTo = await this.adjustBatchStock(
        new BatchStockCommands.AdjustBatchStockCommand(toStock._id.toString(), data.quantity),
        options,
      );
      return { from: updatedFrom, to: updatedTo };
    } else {
      // Создаём новый
      const newTo = await this.createBatchStock(
        new BatchStockCommands.CreateBatchStockCommand({
          batchId: data.batchId,
          locationType: data.toLocationType,
          shopId: data.toShopId,
          warehouseId: data.toWarehouseId,
          shopProductId: data.toShopProductId,
          warehouseProductId: data.toWarehouseProductId,
          quantity: data.quantity,
        }),
        options,
      );
      return { from: updatedFrom, to: newTo };
    }
  }

  async consumeFifo(
    command: BatchStockCommands.ConsumeFifoCommand,
    options?: CommonCommandOptions,
  ): Promise<FifoConsumeResult> {
    const { data } = command;

    // Получаем партии в порядке FIFO
    const stocks = await this.getBatchStocksForFifo(
      new BatchStockQueries.GetBatchStocksForFifoQuery({
        locationType: data.locationType,
        shopId: data.shopId,
        warehouseId: data.warehouseId,
        shopProductId: data.shopProductId,
        warehouseProductId: data.warehouseProductId,
      }),
      options,
    );

    let remaining = data.quantity;
    const consumed: FifoConsumeResult['consumed'] = [];

    for (const stock of stocks) {
      if (remaining <= 0) break;

      const available = stock.quantity - stock.reservedQuantity;
      if (available <= 0) continue;

      const toConsume = Math.min(available, remaining);
      const batch = stock.batch as any;

      // Списываем
      await this.adjustBatchStock(
        new BatchStockCommands.AdjustBatchStockCommand(stock._id.toString(), -toConsume),
        options,
      );

      consumed.push({
        batchStockId: stock._id.toString(),
        batchId: batch._id.toString(),
        batchNumber: batch.batchNumber,
        expirationDate: batch.expirationDate,
        quantity: toConsume,
      });

      remaining -= toConsume;
    }

    return {
      consumed,
      totalConsumed: data.quantity - remaining,
      remainingToConsume: remaining,
    };
  }

  async writeOffBatchStock(
    command: BatchStockCommands.WriteOffBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock> {
    return this.adjustBatchStock(
      new BatchStockCommands.AdjustBatchStockCommand(command.batchStockId, -command.quantity),
      options,
    );
  }
}
