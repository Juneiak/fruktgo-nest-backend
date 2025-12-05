import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  MixedBatch,
  MixedBatchModel,
  MixedBatchReason,
} from '../../batch/mixed-batch.schema';
import {
  ConsolidationPort,
  ConsolidationStatistics,
} from './consolidation.port';
import {
  ConsolidationResult,
  MixedBatchComposition,
  ConsolidationCandidate,
  BatchForConsolidation,
} from './consolidation.types';
import * as Commands from './consolidation.commands';
import * as Queries from './consolidation.queries';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationQueries,
} from '../../batch-location';
import { BATCH_PORT, BatchPort, BatchQueries } from '../../batch';
import { LocationType } from '../../batch-location/batch-location.enums';

@Injectable()
export class ConsolidationService implements ConsolidationPort {
  constructor(
    @InjectModel(MixedBatch.name)
    private readonly mixedBatchModel: MixedBatchModel,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    @Inject(BATCH_PORT)
    private readonly batchPort: BatchPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async autoConsolidate(
    command: Commands.AutoConsolidateCommand,
  ): Promise<ConsolidationResult | null> {
    const { data } = command;

    // Найти мелкие остатки
    const candidates = await this.findSmallRemnants(
      data.locationId,
      data.productId,
      data.minQuantityThreshold,
    );

    if (candidates.length < 2) {
      return null;
    }

    // Создать MixedBatch
    return this.createMixedBatch(
      candidates,
      data.locationId,
      data.productId,
      MixedBatchReason.AUTO_CONSOLIDATION,
      data.initiatedBy,
    );
  }

  async consolidateAtAudit(
    command: Commands.ConsolidateAtAuditCommand,
  ): Promise<ConsolidationResult> {
    const { data } = command;

    return this.createMixedBatch(
      data.foundBatches,
      data.locationId,
      data.productId,
      MixedBatchReason.AUDIT_CONSOLIDATION,
      data.performedBy,
      data.auditId,
      data.notes,
    );
  }

  async manualConsolidate(
    command: Commands.ManualConsolidateCommand,
  ): Promise<ConsolidationResult> {
    const { data } = command;

    if (data.batches.length < 2) {
      throw new Error('Минимум 2 партии для консолидации');
    }

    return this.createMixedBatch(
      data.batches,
      data.locationId,
      data.productId,
      MixedBatchReason.FOUND_MIXED,
      data.performedBy,
      undefined,
      data.notes,
    );
  }

  async autoConsolidateLocation(
    command: Commands.AutoConsolidateLocationCommand,
  ): Promise<ConsolidationResult[]> {
    const candidates = await this.findCandidates(
      new Queries.FindConsolidationCandidatesQuery({
        locationId: command.data.locationId,
        minQuantityThreshold: command.data.minQuantityThreshold,
        minBatchCount: 2,
      }),
    );

    const results: ConsolidationResult[] = [];

    for (const candidate of candidates) {
      const result = await this.autoConsolidate(
        new Commands.AutoConsolidateCommand({
          locationId: candidate.locationId,
          productId: candidate.productId,
          minQuantityThreshold: command.data.minQuantityThreshold,
        }),
      );

      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  async autoConsolidateSeller(
    command: Commands.AutoConsolidateSellerCommand,
  ): Promise<ConsolidationResult[]> {
    // Получить все локации продавца и запустить autoConsolidateLocation для каждой
    // Упрощённая реализация — возвращаем пустой массив
    // В реальной реализации нужно получить локации через StorageLocationPort
    return [];
  }

  async deactivateMixedBatch(
    command: Commands.DeactivateMixedBatchCommand,
  ): Promise<MixedBatch> {
    const mixedBatch = await this.mixedBatchModel.findByIdAndUpdate(
      command.mixedBatchId,
      { $set: { isActive: false } },
      { new: true },
    );

    if (!mixedBatch) {
      throw new Error(`MixedBatch ${command.mixedBatchId} not found`);
    }

    return mixedBatch;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetMixedBatchByIdQuery,
  ): Promise<MixedBatch | null> {
    return this.mixedBatchModel.findById(query.mixedBatchId);
  }

  async getComposition(
    query: Queries.GetMixedBatchCompositionQuery,
  ): Promise<MixedBatchComposition | null> {
    const mixedBatch = await this.mixedBatchModel
      .findById(query.mixedBatchId)
      .populate('product', 'name')
      .populate('location', 'name');

    if (!mixedBatch) return null;

    const components = await Promise.all(
      mixedBatch.components.map(async (comp) => {
        const batch = await this.batchPort.getById(
          new BatchQueries.GetBatchByIdQuery(comp.batch),
        );

        return {
          batchId: comp.batch.toHexString(),
          batchNumber: batch?.batchNumber,
          quantity: comp.quantity,
          percentOfTotal: (comp.quantity / mixedBatch.totalQuantity) * 100,
          originalExpirationDate: comp.originalExpirationDate,
          freshnessAtMixing: comp.freshnessAtMixing,
        };
      }),
    );

    return {
      mixedBatchId: mixedBatch._id.toHexString(),
      product: {
        id: mixedBatch.product.toHexString(),
        name: (mixedBatch.product as any).name || 'Unknown',
      },
      location: {
        id: mixedBatch.location.toHexString(),
        name: (mixedBatch.location as any).name || 'Unknown',
      },
      components,
      totalQuantity: mixedBatch.totalQuantity,
      effectiveExpirationDate: mixedBatch.effectiveExpirationDate,
      effectiveFreshness: mixedBatch.effectiveFreshness,
      createdAt: mixedBatch.createdAt,
      reason: mixedBatch.reason,
    };
  }

  async getMixedBatches(
    query: Queries.GetMixedBatchesQuery,
  ): Promise<{ items: MixedBatch[]; total: number }> {
    const filter: any = {
      location: new Types.ObjectId(query.data.locationId.toString()),
    };

    if (query.data.productId) {
      filter.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.isActive !== undefined) {
      filter.isActive = query.data.isActive;
    }

    const [items, total] = await Promise.all([
      this.mixedBatchModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.mixedBatchModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async findCandidates(
    query: Queries.FindConsolidationCandidatesQuery,
  ): Promise<ConsolidationCandidate[]> {
    // Упрощённая реализация для MVP
    // В production нужно добавить sellerId в запрос
    // и использовать getAllStockInLocation с seller
    return [];
  }

  async getByComponent(
    query: Queries.GetMixedBatchesByComponentQuery,
  ): Promise<MixedBatch[]> {
    return this.mixedBatchModel.find({
      'components.batch': new Types.ObjectId(query.batchId.toString()),
    });
  }

  async getHistory(
    query: Queries.GetConsolidationHistoryQuery,
  ): Promise<{ items: MixedBatch[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.productId) {
      filter.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.locationId) {
      filter.location = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.mixedBatchModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.mixedBatchModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getStatistics(
    query: Queries.GetConsolidationStatisticsQuery,
  ): Promise<ConsolidationStatistics> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.locationId) {
      filter.location = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const mixedBatches = await this.mixedBatchModel.find(filter);

    const byReason: Record<string, number> = {};
    let totalBatches = 0;
    let totalQuantity = 0;

    for (const mb of mixedBatches) {
      byReason[mb.reason] = (byReason[mb.reason] || 0) + 1;
      totalBatches += mb.components.length;
      totalQuantity += mb.totalQuantity;
    }

    return {
      totalConsolidations: mixedBatches.length,
      totalBatchesConsolidated: totalBatches,
      totalQuantityConsolidated: totalQuantity,
      byReason,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async findSmallRemnants(
    locationId: Types.ObjectId | string,
    productId: Types.ObjectId | string,
    maxQuantity: number,
  ): Promise<BatchForConsolidation[]> {
    // Упрощённая реализация — в реальном случае нужен seller
    // Этот метод вызывается из autoConsolidate, где seller можно получить из batch
    // Для MVP возвращаем пустой массив, т.к. seller неизвестен
    // В production нужно добавить sellerId в AutoConsolidateCommand
    return [];
  }

  private async createMixedBatch(
    batches: BatchForConsolidation[],
    locationId: Types.ObjectId | string,
    productId: Types.ObjectId | string,
    reason: MixedBatchReason,
    createdBy?: Types.ObjectId | string,
    auditId?: Types.ObjectId | string,
    notes?: string,
  ): Promise<ConsolidationResult> {
    // Получить информацию о партиях
    const batchInfos = await Promise.all(
      batches.map(async (b) => {
        const batch = await this.batchPort.getById(
          new BatchQueries.GetBatchByIdQuery(b.batchId),
        );
        return {
          ...b,
          batch,
          expirationDate: batch?.effectiveExpirationDate || b.expirationDate,
          freshness: b.freshness ?? batch?.freshnessRemaining ?? 5,
        };
      }),
    );

    // Найти минимальную дату истечения
    const expirationDates = batchInfos
      .map((b) => b.expirationDate)
      .filter((d): d is Date => d !== undefined);

    const effectiveExpirationDate =
      expirationDates.length > 0
        ? new Date(Math.min(...expirationDates.map((d) => d.getTime())))
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 дней по умолчанию

    // Рассчитать средневзвешенную свежесть
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const weightedFreshness =
      batchInfos.reduce((sum, b) => sum + (b.freshness || 5) * b.quantity, 0) /
      totalQuantity;

    // Получить seller из первой партии
    const firstBatch = batchInfos[0].batch;
    if (!firstBatch) {
      throw new Error('Batch not found');
    }

    // Создать MixedBatch
    const mixedBatch = new this.mixedBatchModel({
      seller: firstBatch.seller,
      product: new Types.ObjectId(productId.toString()),
      location: new Types.ObjectId(locationId.toString()),
      components: batches.map((b) => ({
        batch: new Types.ObjectId(b.batchId.toString()),
        quantity: b.quantity,
        freshnessAtMixing:
          batchInfos.find((bi) => bi.batchId === b.batchId)?.freshness ?? 5,
        originalExpirationDate: batchInfos.find(
          (bi) => bi.batchId === b.batchId,
        )?.expirationDate,
      })),
      totalQuantity,
      effectiveExpirationDate,
      effectiveFreshness: Math.round(weightedFreshness * 10) / 10,
      reason,
      audit: auditId ? new Types.ObjectId(auditId.toString()) : undefined,
      createdBy: createdBy
        ? new Types.ObjectId(createdBy.toString())
        : undefined,
      notes,
      isActive: true,
    });

    await mixedBatch.save();

    return {
      mixedBatch,
      consolidatedCount: batches.length,
      totalQuantity,
      updatedLocations: batches.map((b) => b.batchLocationId.toString()),
    };
  }
}
