import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BatchLocation, BatchLocationModel, BatchLocationDocument } from './batch-location.schema';
import {
  BatchLocationPort,
  FefoConsumeResult,
  ReserveResult,
  AggregatedStock,
  LocationStockStatistics,
  AvailabilityCheck,
} from './batch-location.port';
import { BatchLocationStatus, LocationType, QuantityChangeReason } from './batch-location.enums';
import * as Commands from './batch-location.commands';
import * as Queries from './batch-location.queries';

@Injectable()
export class BatchLocationService implements BatchLocationPort {
  constructor(
    @InjectModel(BatchLocation.name)
    private readonly batchLocationModel: BatchLocationModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(
    command: Commands.CreateBatchLocationCommand,
  ): Promise<BatchLocation> {
    const { data } = command;

    const batchLocation = new this.batchLocationModel({
      batch: new Types.ObjectId(data.batch.toString()),
      seller: new Types.ObjectId(data.seller.toString()),
      product: new Types.ObjectId(data.product.toString()),
      locationType: data.locationType,
      shop:
        data.locationType === LocationType.SHOP && data.shop
          ? new Types.ObjectId(data.shop.toString())
          : undefined,
      warehouse:
        data.locationType === LocationType.WAREHOUSE && data.warehouse
          ? new Types.ObjectId(data.warehouse.toString())
          : undefined,
      locationName: data.locationName,
      quantity: data.quantity,
      reservedQuantity: 0,
      degradationCoefficient: data.degradationCoefficient,
      arrivedAt: data.arrivedAt,
      effectiveExpirationDate: data.effectiveExpirationDate,
      freshnessRemaining: data.freshnessRemaining,
      purchasePrice: data.purchasePrice,
      status: BatchLocationStatus.ACTIVE,
      changeLog: [
        {
          changedAt: new Date(),
          reason: QuantityChangeReason.RECEIVING,
          quantityDelta: data.quantity,
          quantityBefore: 0,
          quantityAfter: data.quantity,
        },
      ],
    });

    return batchLocation.save();
  }

  async changeQuantity(
    command: Commands.ChangeQuantityCommand,
  ): Promise<BatchLocation> {
    const bl = await this.batchLocationModel.findById(command.batchLocationId);
    if (!bl) {
      throw new Error(`BatchLocation ${command.batchLocationId} not found`);
    }

    const quantityBefore = bl.quantity;
    const quantityAfter = Math.max(0, quantityBefore + command.data.quantityDelta);

    bl.quantity = quantityAfter;

    // Добавляем запись в лог (храним последние 100)
    bl.changeLog.push({
      changedAt: new Date(),
      reason: command.data.reason,
      quantityDelta: command.data.quantityDelta,
      quantityBefore,
      quantityAfter,
      changedBy: command.data.changedBy
        ? new Types.ObjectId(command.data.changedBy.toString())
        : undefined,
      referenceId: command.data.referenceId
        ? new Types.ObjectId(command.data.referenceId.toString())
        : undefined,
      referenceType: command.data.referenceType,
      comment: command.data.comment,
    });

    // Ограничиваем размер лога
    if (bl.changeLog.length > 100) {
      bl.changeLog = bl.changeLog.slice(-100);
    }

    // Если количество = 0, помечаем как израсходованный
    if (quantityAfter <= 0) {
      bl.status = BatchLocationStatus.DEPLETED;
    }

    return bl.save();
  }

  async consumeByFefo(
    command: Commands.ConsumeByFefoCommand,
  ): Promise<FefoConsumeResult> {
    const { data } = command;

    // Получаем все BatchLocation для товара в локации, отсортированные по сроку
    const locationField =
      data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const batchLocations = await this.batchLocationModel
      .find({
        seller: new Types.ObjectId(data.seller.toString()),
        product: new Types.ObjectId(data.product.toString()),
        locationType: data.locationType,
        [locationField]: new Types.ObjectId(data.locationId.toString()),
        status: BatchLocationStatus.ACTIVE,
        quantity: { $gt: 0 },
      })
      .sort({ effectiveExpirationDate: 1 }); // FEFO

    let remainingToConsume = data.quantity;
    const consumedFromBatches: FefoConsumeResult['consumedFromBatches'] = [];

    for (const bl of batchLocations) {
      if (remainingToConsume <= 0) break;

      const available = data.useAvailableOnly
        ? bl.quantity - bl.reservedQuantity
        : bl.quantity;

      if (available <= 0) continue;

      const toConsume = Math.min(available, remainingToConsume);

      // Списываем
      await this.changeQuantity(
        new Commands.ChangeQuantityCommand(bl._id, {
          quantityDelta: -toConsume,
          reason: data.reason,
          changedBy: data.changedBy,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
        }),
      );

      consumedFromBatches.push({
        batchLocationId: bl._id.toHexString(),
        batchId: bl.batch.toHexString(),
        quantity: toConsume,
        remainingQuantity: bl.quantity - toConsume,
      });

      remainingToConsume -= toConsume;
    }

    const totalConsumed = data.quantity - remainingToConsume;

    return {
      totalConsumed,
      consumedFromBatches,
      fullyConsumed: remainingToConsume <= 0,
      shortfall: remainingToConsume > 0 ? remainingToConsume : undefined,
    };
  }

  async reserveByFefo(
    command: Commands.ReserveByFefoCommand,
  ): Promise<ReserveResult> {
    const { data } = command;

    const locationField =
      data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const batchLocations = await this.batchLocationModel
      .find({
        seller: new Types.ObjectId(data.seller.toString()),
        product: new Types.ObjectId(data.product.toString()),
        locationType: data.locationType,
        [locationField]: new Types.ObjectId(data.locationId.toString()),
        status: BatchLocationStatus.ACTIVE,
        $expr: { $gt: [{ $subtract: ['$quantity', '$reservedQuantity'] }, 0] },
      })
      .sort({ effectiveExpirationDate: 1 });

    let remainingToReserve = data.quantity;
    const reservedFromBatches: ReserveResult['reservedFromBatches'] = [];

    for (const bl of batchLocations) {
      if (remainingToReserve <= 0) break;

      const available = bl.quantity - bl.reservedQuantity;
      if (available <= 0) continue;

      const toReserve = Math.min(available, remainingToReserve);

      // Увеличиваем резерв
      bl.reservedQuantity += toReserve;
      bl.changeLog.push({
        changedAt: new Date(),
        reason: QuantityChangeReason.RESERVATION,
        quantityDelta: 0, // quantity не меняется
        quantityBefore: bl.quantity,
        quantityAfter: bl.quantity,
        referenceId: new Types.ObjectId(data.orderId.toString()),
        referenceType: 'Order',
        comment: `Reserved ${toReserve} for order`,
      });
      await bl.save();

      reservedFromBatches.push({
        batchLocationId: bl._id.toHexString(),
        batchId: bl.batch.toHexString(),
        quantity: toReserve,
      });

      remainingToReserve -= toReserve;
    }

    const reservedQuantity = data.quantity - remainingToReserve;

    return {
      success: remainingToReserve <= 0,
      reservedQuantity,
      reservedFromBatches,
      shortfall: remainingToReserve > 0 ? remainingToReserve : undefined,
    };
  }

  async releaseReservation(
    command: Commands.ReleaseReservationCommand,
  ): Promise<void> {
    const { data } = command;

    // Находим все BatchLocation с резервом для этого заказа
    // (в changeLog ищем записи RESERVATION с referenceId = orderId)
    const filter: any = {
      'changeLog.referenceId': new Types.ObjectId(data.orderId.toString()),
      'changeLog.reason': QuantityChangeReason.RESERVATION,
      reservedQuantity: { $gt: 0 },
    };

    if (data.batchLocationIds && data.batchLocationIds.length > 0) {
      filter._id = {
        $in: data.batchLocationIds.map((id) => new Types.ObjectId(id.toString())),
      };
    }

    const batchLocations = await this.batchLocationModel.find(filter);

    for (const bl of batchLocations) {
      // Вычисляем сколько было зарезервировано для этого заказа
      const reservationLogs = bl.changeLog.filter(
        (log) =>
          log.reason === QuantityChangeReason.RESERVATION &&
          log.referenceId?.toString() === data.orderId.toString(),
      );

      let reservedForOrder = 0;
      for (const log of reservationLogs) {
        // Парсим из комментария
        const match = log.comment?.match(/Reserved (\d+\.?\d*)/);
        if (match) {
          reservedForOrder += parseFloat(match[1]);
        }
      }

      if (reservedForOrder > 0) {
        bl.reservedQuantity = Math.max(0, bl.reservedQuantity - reservedForOrder);
        bl.changeLog.push({
          changedAt: new Date(),
          reason: QuantityChangeReason.RELEASE_RESERVATION,
          quantityDelta: 0,
          quantityBefore: bl.quantity,
          quantityAfter: bl.quantity,
          referenceId: new Types.ObjectId(data.orderId.toString()),
          referenceType: 'Order',
          comment: `Released ${reservedForOrder}, reason: ${data.reason || 'unknown'}`,
        });
        await bl.save();
      }
    }
  }

  async forceReleaseReservation(
    command: Commands.ForceReleaseReservationCommand,
  ): Promise<number> {
    const { data } = command;

    const locationField =
      data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const batchLocations = await this.batchLocationModel
      .find({
        seller: new Types.ObjectId(data.seller.toString()),
        product: new Types.ObjectId(data.product.toString()),
        locationType: data.locationType,
        [locationField]: new Types.ObjectId(data.locationId.toString()),
        reservedQuantity: { $gt: 0 },
      })
      .sort({ effectiveExpirationDate: -1 }); // Сначала с дальним сроком (сохраняем FEFO для продаж)

    let remainingToRelease = data.quantity;
    let totalReleased = 0;

    for (const bl of batchLocations) {
      if (remainingToRelease <= 0) break;

      const toRelease = Math.min(bl.reservedQuantity, remainingToRelease);

      bl.reservedQuantity -= toRelease;
      bl.changeLog.push({
        changedAt: new Date(),
        reason: QuantityChangeReason.RELEASE_RESERVATION,
        quantityDelta: 0,
        quantityBefore: bl.quantity,
        quantityAfter: bl.quantity,
        comment: `Force released ${toRelease}, reason: ${data.reason}`,
      });
      await bl.save();

      totalReleased += toRelease;
      remainingToRelease -= toRelease;
    }

    return totalReleased;
  }

  async syncFromBatch(command: Commands.SyncFromBatchCommand): Promise<void> {
    const update: any = {};

    if (command.data.effectiveExpirationDate) {
      update.effectiveExpirationDate = command.data.effectiveExpirationDate;
    }
    if (command.data.freshnessRemaining !== undefined) {
      update.freshnessRemaining = command.data.freshnessRemaining;
    }

    if (Object.keys(update).length > 0) {
      await this.batchLocationModel.updateMany(
        { batch: new Types.ObjectId(command.batchId.toString()) },
        { $set: update },
      );
    }
  }

  async transferToLocation(
    command: Commands.TransferToLocationCommand,
  ): Promise<{ source: BatchLocation; target: BatchLocation }> {
    const source = await this.batchLocationModel.findById(
      command.sourceBatchLocationId,
    );
    if (!source) {
      throw new Error(`Source BatchLocation ${command.sourceBatchLocationId} not found`);
    }

    if (source.quantity < command.data.quantity) {
      throw new Error(
        `Insufficient quantity: ${source.quantity} < ${command.data.quantity}`,
      );
    }

    // Уменьшаем количество в источнике
    source.quantity -= command.data.quantity;
    source.changeLog.push({
      changedAt: new Date(),
      reason: QuantityChangeReason.TRANSFER_OUT,
      quantityDelta: -command.data.quantity,
      quantityBefore: source.quantity + command.data.quantity,
      quantityAfter: source.quantity,
      changedBy: command.data.transferredBy
        ? new Types.ObjectId(command.data.transferredBy.toString())
        : undefined,
      referenceId: command.data.transferId
        ? new Types.ObjectId(command.data.transferId.toString())
        : undefined,
      referenceType: 'Transfer',
    });

    if (source.quantity <= 0) {
      source.status = BatchLocationStatus.TRANSFERRED;
    }

    await source.save();

    // Ищем или создаём запись в целевой локации
    const targetLocationField =
      command.data.targetLocationType === LocationType.SHOP
        ? 'shop'
        : 'warehouse';

    let target = await this.batchLocationModel.findOne({
      batch: source.batch,
      locationType: command.data.targetLocationType,
      [targetLocationField]: new Types.ObjectId(
        command.data.targetLocationId.toString(),
      ),
    });

    if (target) {
      // Увеличиваем количество
      target.quantity += command.data.quantity;
      target.degradationCoefficient = command.data.newDegradationCoefficient;
      target.changeLog.push({
        changedAt: new Date(),
        reason: QuantityChangeReason.TRANSFER_IN,
        quantityDelta: command.data.quantity,
        quantityBefore: target.quantity - command.data.quantity,
        quantityAfter: target.quantity,
        changedBy: command.data.transferredBy
          ? new Types.ObjectId(command.data.transferredBy.toString())
          : undefined,
        referenceId: command.data.transferId
          ? new Types.ObjectId(command.data.transferId.toString())
          : undefined,
        referenceType: 'Transfer',
      });
      target.status = BatchLocationStatus.ACTIVE;
      await target.save();
    } else {
      // Создаём новую запись
      target = await this.create(
        new Commands.CreateBatchLocationCommand({
          batch: source.batch,
          seller: source.seller,
          product: source.product,
          locationType: command.data.targetLocationType,
          shop:
            command.data.targetLocationType === LocationType.SHOP
              ? command.data.targetLocationId
              : undefined,
          warehouse:
            command.data.targetLocationType === LocationType.WAREHOUSE
              ? command.data.targetLocationId
              : undefined,
          locationName: command.data.targetLocationName,
          quantity: command.data.quantity,
          degradationCoefficient: command.data.newDegradationCoefficient,
          arrivedAt: new Date(),
          effectiveExpirationDate: source.effectiveExpirationDate,
          freshnessRemaining: source.freshnessRemaining,
          purchasePrice: source.purchasePrice,
        }),
      );
    }

    return { source, target };
  }

  async applyShrinkage(
    command: Commands.ApplyShrinkageCommand,
  ): Promise<BatchLocation> {
    return this.changeQuantity(
      new Commands.ChangeQuantityCommand(command.batchLocationId, {
        quantityDelta: -command.data.shrinkageQuantity,
        reason: QuantityChangeReason.SHRINKAGE,
        comment: 'Auto shrinkage',
      }),
    );
  }

  async markDepleted(
    command: Commands.MarkDepletedCommand,
  ): Promise<BatchLocation> {
    const bl = await this.batchLocationModel.findByIdAndUpdate(
      command.batchLocationId,
      { $set: { status: BatchLocationStatus.DEPLETED } },
      { new: true },
    );
    if (!bl) {
      throw new Error(`BatchLocation ${command.batchLocationId} not found`);
    }
    return bl;
  }

  async reserve(
    command: Commands.ReserveQuantityCommand,
  ): Promise<BatchLocation> {
    const bl = await this.batchLocationModel.findById(command.batchLocationId);
    if (!bl) {
      throw new Error(`BatchLocation ${command.batchLocationId} not found`);
    }

    const available = bl.quantity - bl.reservedQuantity;
    if (available < command.quantity) {
      throw new Error(
        `Insufficient available quantity: ${available} < ${command.quantity}`,
      );
    }

    bl.reservedQuantity += command.quantity;
    return bl.save();
  }

  async releaseReserve(
    command: Commands.ReleaseReserveCommand,
  ): Promise<BatchLocation> {
    const bl = await this.batchLocationModel.findById(command.batchLocationId);
    if (!bl) {
      throw new Error(`BatchLocation ${command.batchLocationId} not found`);
    }

    if (bl.reservedQuantity < command.quantity) {
      throw new Error(
        `Cannot release more than reserved: ${bl.reservedQuantity} < ${command.quantity}`,
      );
    }

    bl.reservedQuantity -= command.quantity;
    return bl.save();
  }

  async confirmReserve(
    command: Commands.ConfirmReserveCommand,
  ): Promise<BatchLocation> {
    const bl = await this.batchLocationModel.findById(command.batchLocationId);
    if (!bl) {
      throw new Error(`BatchLocation ${command.batchLocationId} not found`);
    }

    if (bl.reservedQuantity < command.quantity) {
      throw new Error(
        `Cannot confirm more than reserved: ${bl.reservedQuantity} < ${command.quantity}`,
      );
    }

    // Снимаем резерв и списываем количество
    bl.reservedQuantity -= command.quantity;
    bl.quantity -= command.quantity;

    // Если партия исчерпана
    if (bl.quantity <= 0) {
      bl.status = BatchLocationStatus.DEPLETED;
    }

    return bl.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetBatchLocationByIdQuery,
  ): Promise<BatchLocation | null> {
    return this.batchLocationModel.findById(query.batchLocationId);
  }

  async getByBatch(query: Queries.GetByBatchQuery): Promise<BatchLocation[]> {
    return this.batchLocationModel.find({
      batch: new Types.ObjectId(query.batchId.toString()),
    });
  }

  async getBatchInLocation(
    query: Queries.GetBatchInLocationQuery,
  ): Promise<BatchLocation | null> {
    const locationField =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    return this.batchLocationModel.findOne({
      batch: new Types.ObjectId(query.data.batchId.toString()),
      locationType: query.data.locationType,
      [locationField]: new Types.ObjectId(query.data.locationId.toString()),
    });
  }

  async getProductStockInLocation(
    query: Queries.GetProductStockInLocationQuery,
  ): Promise<BatchLocation[]> {
    const locationField =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const filter: any = {
      seller: new Types.ObjectId(query.data.seller.toString()),
      product: new Types.ObjectId(query.data.product.toString()),
      locationType: query.data.locationType,
      [locationField]: new Types.ObjectId(query.data.locationId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.withQuantityOnly) {
      filter.quantity = { $gt: 0 };
    }

    let q = this.batchLocationModel.find(filter);

    if (query.data.sortByExpiration) {
      q = q.sort({ effectiveExpirationDate: 1 });
    }

    return q.exec();
  }

  async getAggregatedStock(
    query: Queries.GetAggregatedStockQuery,
  ): Promise<AggregatedStock[]> {
    const locationField =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const match: any = {
      locationType: query.data.locationType,
      [locationField]: new Types.ObjectId(query.data.locationId.toString()),
      status: BatchLocationStatus.ACTIVE,
    };

    if (query.data.productId) {
      match.product = new Types.ObjectId(query.data.productId.toString());
    }

    const result = await this.batchLocationModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$product',
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reservedQuantity' },
          batchCount: { $sum: 1 },
          nearestExpirationDate: { $min: '$effectiveExpirationDate' },
          totalFreshness: { $sum: { $multiply: ['$freshnessRemaining', '$quantity'] } },
          totalValue: {
            $sum: { $multiply: ['$purchasePrice', '$quantity'] },
          },
        },
      },
      {
        $project: {
          productId: { $toString: '$_id' },
          totalQuantity: 1,
          totalReserved: 1,
          availableQuantity: { $subtract: ['$totalQuantity', '$totalReserved'] },
          batchCount: 1,
          nearestExpirationDate: 1,
          averageFreshness: {
            $cond: [
              { $gt: ['$totalQuantity', 0] },
              { $divide: ['$totalFreshness', '$totalQuantity'] },
              0,
            ],
          },
          averagePurchasePrice: {
            $cond: [
              { $gt: ['$totalQuantity', 0] },
              { $divide: ['$totalValue', '$totalQuantity'] },
              null,
            ],
          },
        },
      },
    ]);

    return result;
  }

  async getAllStockInLocation(
    query: Queries.GetAllStockInLocationQuery,
  ): Promise<{ items: BatchLocation[]; total: number }> {
    const locationField =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const filter: any = {
      seller: new Types.ObjectId(query.data.seller.toString()),
      locationType: query.data.locationType,
      [locationField]: new Types.ObjectId(query.data.locationId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.withQuantityOnly) {
      filter.quantity = { $gt: 0 };
    }

    const [items, total] = await Promise.all([
      this.batchLocationModel
        .find(filter)
        .sort({ effectiveExpirationDate: 1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 100),
      this.batchLocationModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getReservedByOrder(
    query: Queries.GetReservedByOrderQuery,
  ): Promise<BatchLocation[]> {
    return this.batchLocationModel.find({
      'changeLog.referenceId': new Types.ObjectId(query.orderId.toString()),
      'changeLog.reason': QuantityChangeReason.RESERVATION,
      reservedQuantity: { $gt: 0 },
    });
  }

  async checkAvailability(
    query: Queries.CheckAvailabilityQuery,
  ): Promise<AvailabilityCheck> {
    const stocks = await this.getProductStockInLocation(
      new Queries.GetProductStockInLocationQuery({
        seller: query.data.seller,
        product: query.data.product,
        locationType: query.data.locationType,
        locationId: query.data.locationId,
        status: BatchLocationStatus.ACTIVE,
        withQuantityOnly: true,
      }),
    );

    const availableQuantity = stocks.reduce(
      (sum, bl) => sum + (bl.quantity - bl.reservedQuantity),
      0,
    );

    const shortfall = Math.max(0, query.data.quantity - availableQuantity);

    return {
      isAvailable: shortfall === 0,
      requestedQuantity: query.data.quantity,
      availableQuantity,
      shortfall,
    };
  }

  async getLowStock(
    query: Queries.GetLowStockQuery,
  ): Promise<AggregatedStock[]> {
    const allStock = await this.getAggregatedStock(
      new Queries.GetAggregatedStockQuery({
        locationType: query.data.locationType,
        locationId: query.data.locationId,
      }),
    );

    return allStock.filter((s) => s.availableQuantity < query.data.threshold);
  }

  async getLocationStatistics(
    query: Queries.GetLocationStockStatisticsQuery,
  ): Promise<LocationStockStatistics> {
    const locationField =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const result = await this.batchLocationModel.aggregate([
      {
        $match: {
          locationType: query.data.locationType,
          [locationField]: new Types.ObjectId(query.data.locationId.toString()),
          status: BatchLocationStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $addToSet: '$product' },
          totalBatches: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reservedQuantity' },
          totalValue: { $sum: { $multiply: ['$purchasePrice', '$quantity'] } },
          expiringBatches: {
            $sum: {
              $cond: [{ $lte: ['$effectiveExpirationDate', in7Days] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          totalProducts: { $size: '$totalProducts' },
          totalBatches: 1,
          totalQuantity: 1,
          totalReserved: 1,
          totalValue: 1,
          expiringBatches: 1,
        },
      },
    ]);

    if (result.length === 0) {
      return {
        totalProducts: 0,
        totalBatches: 0,
        totalQuantity: 0,
        totalReserved: 0,
        totalValue: 0,
        expiringBatches: 0,
        lowStockProducts: 0,
      };
    }

    const stats = result[0];

    // Считаем low stock отдельно (нужен threshold)
    const lowStock = await this.getLowStock(
      new Queries.GetLowStockQuery({
        locationType: query.data.locationType,
        locationId: query.data.locationId,
        threshold: 10, // default threshold
      }),
    );

    return {
      totalProducts: stats.totalProducts,
      totalBatches: stats.totalBatches,
      totalQuantity: stats.totalQuantity,
      totalReserved: stats.totalReserved,
      totalValue: stats.totalValue || 0,
      expiringBatches: stats.expiringBatches,
      lowStockProducts: lowStock.length,
    };
  }
}
