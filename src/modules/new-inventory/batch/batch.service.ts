import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Batch, BatchModel } from './batch.schema';
import { BatchPort, BatchStatistics } from './batch.port';
import { BatchStatus, ExpirationAlertLevel } from './batch.enums';
import * as Commands from './batch.commands';
import * as Queries from './batch.queries';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BatchService implements BatchPort {
  constructor(
    @InjectModel(Batch.name) private readonly batchModel: BatchModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateBatchCommand): Promise<Batch> {
    const { data } = command;

    const batch = new this.batchModel({
      seller: new Types.ObjectId(data.seller.toString()),
      product: new Types.ObjectId(data.product.toString()),
      batchNumber: data.batchNumber,
      productionDate: data.productionDate,
      receivedAt: data.receivedAt,
      originalExpirationDate: data.originalExpirationDate,
      effectiveExpirationDate: data.effectiveExpirationDate,
      freshnessRemaining: data.freshnessRemaining,
      initialFreshness: data.initialFreshness,
      initialQuantity: data.initialQuantity,
      currentQuantity: data.currentQuantity,
      supplier: data.supplier,
      supplierInvoice: data.supplierInvoice,
      purchasePrice: data.purchasePrice,
      receivingId: data.receivingId
        ? new Types.ObjectId(data.receivingId.toString())
        : undefined,
      qrCode: data.qrCode,
      status: BatchStatus.ACTIVE,
      currentLocation: data.currentLocation
        ? {
            ...data.currentLocation,
            locationId: new Types.ObjectId(
              data.currentLocation.locationId.toString(),
            ),
          }
        : undefined,
      locationHistory: data.currentLocation
        ? [
            {
              locationType: data.currentLocation.locationType,
              locationId: new Types.ObjectId(
                data.currentLocation.locationId.toString(),
              ),
              locationName: data.currentLocation.locationName,
              arrivedAt: data.currentLocation.arrivedAt,
              degradationCoefficient: data.currentLocation.degradationCoefficient,
              freshnessOnArrival: data.freshnessRemaining,
            },
          ]
        : [],
    });

    return batch.save();
  }

  async updateQuantity(
    command: Commands.UpdateBatchQuantityCommand,
  ): Promise<Batch> {
    const batch = await this.batchModel.findByIdAndUpdate(
      command.batchId,
      {
        $inc: { currentQuantity: command.data.quantityDelta },
      },
      { new: true },
    );

    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    // Если количество = 0, помечаем как израсходованную
    if (batch.currentQuantity <= 0) {
      batch.status = BatchStatus.DEPLETED;
      await batch.save();
    }

    return batch;
  }

  async updateFreshness(
    command: Commands.UpdateBatchFreshnessCommand,
  ): Promise<Batch> {
    const batch = await this.batchModel.findByIdAndUpdate(
      command.batchId,
      {
        $set: {
          freshnessRemaining: command.data.freshnessRemaining,
          effectiveExpirationDate: command.data.effectiveExpirationDate,
          freshnessLastCalculatedAt: command.data.freshnessLastCalculatedAt,
        },
      },
      { new: true },
    );

    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    return batch;
  }

  async adjustFreshnessManually(
    command: Commands.AdjustFreshnessManuallyCommand,
  ): Promise<Batch> {
    const batch = await this.batchModel.findById(command.batchId);
    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    const adjustment = {
      adjustedAt: new Date(),
      adjustedBy: new Types.ObjectId(command.data.adjustedBy.toString()),
      adjustedByRole: command.data.adjustedByRole,
      previousFreshness: batch.freshnessRemaining,
      newFreshness: command.data.newFreshness,
      reason: command.data.reason,
      comment: command.data.comment,
    };

    batch.freshnessAdjustments.push(adjustment);
    batch.freshnessRemaining = command.data.newFreshness;

    return batch.save();
  }

  async updateStatus(
    command: Commands.UpdateBatchStatusCommand,
  ): Promise<Batch> {
    const batch = await this.batchModel.findByIdAndUpdate(
      command.batchId,
      {
        $set: {
          status: command.data.status,
          blockReason: command.data.blockReason,
          statusComment: command.data.statusComment,
        },
      },
      { new: true },
    );

    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    return batch;
  }

  async moveToLocation(
    command: Commands.MoveBatchToLocationCommand,
  ): Promise<Batch> {
    const batch = await this.batchModel.findById(command.batchId);
    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    // Закрываем предыдущую запись в истории
    if (batch.currentLocation && batch.locationHistory.length > 0) {
      const lastHistory = batch.locationHistory[batch.locationHistory.length - 1];
      lastHistory.departedAt = command.data.moveDate;
      lastHistory.freshnessOnDeparture = batch.freshnessRemaining;
    }

    // Добавляем новую запись в историю
    batch.locationHistory.push({
      locationType: command.data.newLocation.locationType,
      locationId: new Types.ObjectId(
        command.data.newLocation.locationId.toString(),
      ),
      locationName: command.data.newLocation.locationName,
      arrivedAt: command.data.moveDate,
      degradationCoefficient: command.data.newLocation.degradationCoefficient,
      freshnessOnArrival: command.data.newFreshnessRemaining,
    });

    // Обновляем текущую локацию
    batch.currentLocation = {
      locationType: command.data.newLocation.locationType,
      locationId: new Types.ObjectId(
        command.data.newLocation.locationId.toString(),
      ),
      locationName: command.data.newLocation.locationName,
      arrivedAt: command.data.moveDate,
      degradationCoefficient: command.data.newLocation.degradationCoefficient,
    };

    // Обновляем свежесть и срок
    batch.freshnessRemaining = command.data.newFreshnessRemaining;
    batch.effectiveExpirationDate = command.data.newEffectiveExpirationDate;
    batch.freshnessLastCalculatedAt = command.data.moveDate;

    return batch.save();
  }

  async createMixedBatch(
    command: Commands.CreateMixedBatchCommand,
  ): Promise<Batch> {
    const { data } = command;

    // Собираем информацию об исходных партиях
    const sourceBatchIds = data.sourceBatches.map(
      (sb) => new Types.ObjectId(sb.batchId.toString()),
    );

    const sourceBatches = await this.batchModel.find({
      _id: { $in: sourceBatchIds },
    });

    if (sourceBatches.length !== data.sourceBatches.length) {
      throw new Error('Some source batches not found');
    }

    // Рассчитываем средневзвешенную свежесть
    let totalQuantity = 0;
    let weightedFreshness = 0;
    let minExpirationDate = new Date('2100-01-01');

    for (const sb of data.sourceBatches) {
      const batch = sourceBatches.find(
        (b) => b._id.toString() === sb.batchId.toString(),
      );
      if (batch) {
        totalQuantity += sb.quantity;
        weightedFreshness += batch.freshnessRemaining * sb.quantity;
        if (batch.effectiveExpirationDate < minExpirationDate) {
          minExpirationDate = batch.effectiveExpirationDate;
        }
      }
    }

    const avgFreshness = weightedFreshness / totalQuantity;

    // Создаём смешанную партию
    const mixedBatch = new this.batchModel({
      seller: new Types.ObjectId(data.seller.toString()),
      product: new Types.ObjectId(data.product.toString()),
      batchNumber: `MIX-${Date.now()}`,
      receivedAt: new Date(),
      originalExpirationDate: minExpirationDate,
      effectiveExpirationDate: minExpirationDate,
      freshnessRemaining: avgFreshness,
      initialFreshness: avgFreshness,
      initialQuantity: totalQuantity,
      currentQuantity: totalQuantity,
      status: BatchStatus.ACTIVE,
      isMixedBatch: true,
      sourceBatches: sourceBatchIds,
      mixingReason: data.mixingReason,
      currentLocation: {
        locationType: data.location.locationType,
        locationId: new Types.ObjectId(data.location.locationId.toString()),
        locationName: data.location.locationName,
        arrivedAt: new Date(),
        degradationCoefficient: data.location.degradationCoefficient,
      },
      locationHistory: [
        {
          locationType: data.location.locationType,
          locationId: new Types.ObjectId(data.location.locationId.toString()),
          locationName: data.location.locationName,
          arrivedAt: new Date(),
          degradationCoefficient: data.location.degradationCoefficient,
          freshnessOnArrival: avgFreshness,
        },
      ],
    });

    return mixedBatch.save();
  }

  async markExpired(command: Commands.MarkBatchExpiredCommand): Promise<Batch> {
    return this.updateStatus(
      new Commands.UpdateBatchStatusCommand(command.batchId, {
        status: BatchStatus.EXPIRED,
        statusComment: 'Срок годности истёк',
      }),
    );
  }

  async markDepleted(
    command: Commands.MarkBatchDepletedCommand,
  ): Promise<Batch> {
    return this.updateStatus(
      new Commands.UpdateBatchStatusCommand(command.batchId, {
        status: BatchStatus.DEPLETED,
        statusComment: 'Партия израсходована',
      }),
    );
  }

  async block(command: Commands.BlockBatchCommand): Promise<Batch> {
    return this.updateStatus(
      new Commands.UpdateBatchStatusCommand(command.batchId, {
        status: command.data.isDispute ? BatchStatus.DISPUTE : BatchStatus.BLOCKED,
        blockReason: command.data.reason,
        statusComment: command.data.comment,
      }),
    );
  }

  async unblock(command: Commands.UnblockBatchCommand): Promise<Batch> {
    return this.updateStatus(
      new Commands.UpdateBatchStatusCommand(command.batchId, {
        status: BatchStatus.ACTIVE,
        blockReason: undefined,
        statusComment: command.data.comment,
      }),
    );
  }

  async generateQRCode(
    command: Commands.GenerateBatchQRCodeCommand,
  ): Promise<Batch> {
    const qrCode = `BATCH-${uuidv4().substring(0, 8).toUpperCase()}`;

    const batch = await this.batchModel.findByIdAndUpdate(
      command.batchId,
      { $set: { qrCode } },
      { new: true },
    );

    if (!batch) {
      throw new Error(`Batch ${command.batchId} not found`);
    }

    return batch;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetBatchByIdQuery): Promise<Batch | null> {
    return this.batchModel.findById(query.batchId);
  }

  async getByQRCode(query: Queries.GetBatchByQRCodeQuery): Promise<Batch | null> {
    return this.batchModel.findOne({ qrCode: query.qrCode });
  }

  async getByNumber(query: Queries.GetBatchByNumberQuery): Promise<Batch | null> {
    return this.batchModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      batchNumber: query.batchNumber,
    });
  }

  async getByProduct(query: Queries.GetBatchesByProductQuery): Promise<Batch[]> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
      product: new Types.ObjectId(query.data.productId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    let q = this.batchModel.find(filter);

    if (query.data.sortByExpiration) {
      q = q.sort({ effectiveExpirationDate: 1 });
    }

    return q.exec();
  }

  async getInLocation(
    query: Queries.GetBatchesInLocationQuery,
  ): Promise<Batch[]> {
    const filter: any = {
      'currentLocation.locationType': query.data.locationType,
      'currentLocation.locationId': new Types.ObjectId(
        query.data.locationId.toString(),
      ),
    };

    if (query.data.productId) {
      filter.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    let q = this.batchModel.find(filter);

    if (query.data.sortByExpiration) {
      q = q.sort({ effectiveExpirationDate: 1 });
    }

    return q.exec();
  }

  async getExpiring(query: Queries.GetExpiringBatchesQuery): Promise<Batch[]> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
      status: BatchStatus.ACTIVE,
    };

    const now = new Date();

    if (query.data.daysUntilExpiration !== undefined) {
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() + query.data.daysUntilExpiration);
      filter.effectiveExpirationDate = { $lte: threshold, $gt: now };
    } else if (query.data.alertLevel) {
      const levels = Array.isArray(query.data.alertLevel)
        ? query.data.alertLevel
        : [query.data.alertLevel];

      const conditions: any[] = [];

      for (const level of levels) {
        switch (level) {
          case ExpirationAlertLevel.EXPIRED: {
            conditions.push({ effectiveExpirationDate: { $lte: now } });
            break;
          }
          case ExpirationAlertLevel.CRITICAL: {
            const critical = new Date(now);
            critical.setDate(critical.getDate() + 3);
            conditions.push({
              effectiveExpirationDate: { $gt: now, $lte: critical },
            });
            break;
          }
          case ExpirationAlertLevel.WARNING: {
            const warning3 = new Date(now);
            warning3.setDate(warning3.getDate() + 3);
            const warning7 = new Date(now);
            warning7.setDate(warning7.getDate() + 7);
            conditions.push({
              effectiveExpirationDate: { $gt: warning3, $lte: warning7 },
            });
            break;
          }
        }
      }

      if (conditions.length > 0) {
        filter.$or = conditions;
      }
    }

    if (query.data.locationIds && query.data.locationIds.length > 0) {
      filter['currentLocation.locationId'] = {
        $in: query.data.locationIds.map((id) => new Types.ObjectId(id.toString())),
      };
    }

    if (query.data.locationType) {
      filter['currentLocation.locationType'] = query.data.locationType;
    }

    return this.batchModel.find(filter).sort({ effectiveExpirationDate: 1 });
  }

  async getExpiredForWriteOff(
    query: Queries.GetExpiredBatchesForWriteOffQuery,
  ): Promise<Batch[]> {
    const filter: any = {
      status: BatchStatus.ACTIVE,
      effectiveExpirationDate: { $lt: new Date() },
    };

    if (query.data.sellerId) {
      filter.seller = new Types.ObjectId(query.data.sellerId.toString());
    }

    if (query.data.expiredDaysAgo) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - query.data.expiredDaysAgo);
      filter.effectiveExpirationDate = { $lt: threshold };
    }

    return this.batchModel.find(filter);
  }

  async getForConsolidation(
    query: Queries.GetBatchesForConsolidationQuery,
  ): Promise<Batch[]> {
    return this.batchModel.find({
      'currentLocation.locationType': query.data.locationType,
      'currentLocation.locationId': new Types.ObjectId(
        query.data.locationId.toString(),
      ),
      product: new Types.ObjectId(query.data.productId.toString()),
      status: BatchStatus.ACTIVE,
      currentQuantity: { $gt: 0, $lte: query.data.maxQuantity },
    });
  }

  async getMixedBatches(query: Queries.GetMixedBatchesQuery): Promise<Batch[]> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
      isMixedBatch: true,
    };

    if (query.data.productId) {
      filter.product = new Types.ObjectId(query.data.productId.toString());
    }

    return this.batchModel.find(filter);
  }

  async search(
    query: Queries.SearchBatchesQuery,
  ): Promise<{ batches: Batch[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.productId) {
      filter.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.supplier) {
      filter.supplier = { $regex: query.data.supplier, $options: 'i' };
    }

    if (query.data.batchNumber) {
      filter.batchNumber = { $regex: query.data.batchNumber, $options: 'i' };
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.receivedAt = {};
      if (query.data.fromDate) filter.receivedAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.receivedAt.$lte = query.data.toDate;
    }

    if (query.data.isMixedBatch !== undefined) {
      filter.isMixedBatch = query.data.isMixedBatch;
    }

    const sortField = query.data.sortBy || 'effectiveExpirationDate';
    const sortOrder = query.data.sortOrder === 'desc' ? -1 : 1;

    const [batches, total] = await Promise.all([
      this.batchModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.batchModel.countDocuments(filter),
    ]);

    return { batches, total };
  }

  async getStatistics(
    query: Queries.GetBatchStatisticsQuery,
  ): Promise<BatchStatistics> {
    const matchStage: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.productId) {
      matchStage.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.locationId) {
      matchStage['currentLocation.locationId'] = new Types.ObjectId(
        query.data.locationId.toString(),
      );
    }

    if (query.data.locationType) {
      matchStage['currentLocation.locationType'] = query.data.locationType;
    }

    const now = new Date();
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const result = await this.batchModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBatches: { $sum: 1 },
          activeBatches: {
            $sum: { $cond: [{ $eq: ['$status', BatchStatus.ACTIVE] }, 1, 0] },
          },
          expiredBatches: {
            $sum: { $cond: [{ $eq: ['$status', BatchStatus.EXPIRED] }, 1, 0] },
          },
          blockedBatches: {
            $sum: {
              $cond: [
                { $in: ['$status', [BatchStatus.BLOCKED, BatchStatus.DISPUTE]] },
                1,
                0,
              ],
            },
          },
          depletedBatches: {
            $sum: { $cond: [{ $eq: ['$status', BatchStatus.DEPLETED] }, 1, 0] },
          },
          totalQuantity: { $sum: '$currentQuantity' },
          expiringWithin7Days: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', BatchStatus.ACTIVE] },
                    { $lte: ['$effectiveExpirationDate', in7Days] },
                    { $gt: ['$effectiveExpirationDate', now] },
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
                    { $eq: ['$status', BatchStatus.ACTIVE] },
                    { $lte: ['$effectiveExpirationDate', in3Days] },
                    { $gt: ['$effectiveExpirationDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalFreshness: { $sum: '$freshnessRemaining' },
        },
      },
    ]);

    if (result.length === 0) {
      return {
        totalBatches: 0,
        activeBatches: 0,
        expiredBatches: 0,
        blockedBatches: 0,
        depletedBatches: 0,
        totalQuantity: 0,
        expiringWithin7Days: 0,
        expiringWithin3Days: 0,
        averageFreshness: 0,
      };
    }

    const stats = result[0];
    return {
      totalBatches: stats.totalBatches,
      activeBatches: stats.activeBatches,
      expiredBatches: stats.expiredBatches,
      blockedBatches: stats.blockedBatches,
      depletedBatches: stats.depletedBatches,
      totalQuantity: stats.totalQuantity,
      expiringWithin7Days: stats.expiringWithin7Days,
      expiringWithin3Days: stats.expiringWithin3Days,
      averageFreshness:
        stats.totalBatches > 0
          ? stats.totalFreshness / stats.totalBatches
          : 0,
    };
  }
}
