import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Audit, AuditModel } from './audit.schema';
import { AuditPort, ApplyCorrectionsResult, AuditStatistics } from './audit.port';
import {
  AuditType,
  AuditStatus,
  AuditItemStatus,
  DiscrepancyType,
} from './audit.enums';
import {
  LocationType,
  QuantityChangeReason,
} from '../../batch-location/batch-location.enums';
import * as Commands from './audit.commands';
import * as Queries from './audit.queries';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
  BatchLocationQueries,
} from '../../batch-location';
import { BATCH_PORT, BatchPort, BatchQueries } from '../../batch';

@Injectable()
export class AuditService implements AuditPort {
  constructor(
    @InjectModel(Audit.name) private readonly auditModel: AuditModel,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateAuditCommand): Promise<Audit> {
    const { data } = command;

    const documentNumber = await this.generateDocumentNumber(
      data.seller.toString(),
    );

    const audit = new this.auditModel({
      seller: new Types.ObjectId(data.seller.toString()),
      documentNumber,
      type: data.type,
      status: AuditStatus.DRAFT,
      locationType: data.locationType,
      shop:
        data.locationType === LocationType.SHOP
          ? new Types.ObjectId(data.locationId.toString())
          : undefined,
      warehouse:
        data.locationType === LocationType.WAREHOUSE
          ? new Types.ObjectId(data.locationId.toString())
          : undefined,
      locationName: data.locationName,
      filterProducts: data.filterProducts?.map((p) => new Types.ObjectId(p.toString())),
      filterCategories: data.filterCategories?.map((c) => new Types.ObjectId(c.toString())),
      filterExpiringWithinDays: data.filterExpiringWithinDays,
      items: [],
      comment: data.comment,
      createdBy: data.createdBy
        ? new Types.ObjectId(data.createdBy.toString())
        : undefined,
    });

    return audit.save();
  }

  async start(command: Commands.StartAuditCommand): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.DRAFT) {
      throw new Error('Can only start DRAFT audits');
    }

    const locationId =
      audit.locationType === LocationType.SHOP ? audit.shop : audit.warehouse;

    // Получаем все BatchLocations для локации
    const { items: batchLocations } =
      await this.batchLocationPort.getAllStockInLocation(
        new BatchLocationQueries.GetAllStockInLocationQuery({
          seller: audit.seller,
          locationType: audit.locationType,
          locationId: locationId!,
          withQuantityOnly: false,
        }),
      );

    // Фильтруем по критериям
    let filteredLocations = batchLocations;

    if (audit.filterProducts?.length) {
      const filterProductIds = audit.filterProducts.map((p) => p.toHexString());
      filteredLocations = filteredLocations.filter((bl) =>
        filterProductIds.includes(bl.product.toHexString()),
      );
    }

    if (audit.filterExpiringWithinDays !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + audit.filterExpiringWithinDays);
      filteredLocations = filteredLocations.filter(
        (bl) => bl.effectiveExpirationDate <= cutoffDate,
      );
    }

    // Загружаем данные партий для денормализации
    const batchIds = [...new Set(filteredLocations.map((bl) => bl.batch.toHexString()))];
    const batches = await Promise.all(
      batchIds.map((id) =>
        this.batchPort.getById(new BatchQueries.GetBatchByIdQuery(id)),
      ),
    );
    const batchMap = new Map(
      batches.filter(Boolean).map((b) => [b!._id.toHexString(), b!]),
    );

    // Создаём позиции
    audit.items = filteredLocations.map((bl) => {
      const batch = batchMap.get(bl.batch.toHexString());
      return {
        batch: bl.batch,
        batchLocation: bl._id,
        product: bl.product,
        productName: undefined, // TODO: загрузить из Product
        batchNumber: batch?.batchNumber,
        expectedQuantity: bl.quantity,
        actualQuantity: undefined,
        discrepancy: undefined,
        discrepancyType: DiscrepancyType.NONE,
        status: AuditItemStatus.PENDING,
        photos: [],
        expirationDate: bl.effectiveExpirationDate,
      };
    });

    audit.totalItems = audit.items.length;
    audit.countedItems = 0;
    audit.status = AuditStatus.IN_PROGRESS;
    audit.startedBy = new Types.ObjectId(command.data.startedBy.toString());
    audit.startedAt = new Date();

    return audit.save();
  }

  async countItem(command: Commands.CountAuditItemCommand): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new Error('Can only count IN_PROGRESS audits');
    }

    if (command.itemIndex < 0 || command.itemIndex >= audit.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = audit.items[command.itemIndex];
    const wasPending = item.status === AuditItemStatus.PENDING;

    item.actualQuantity = command.data.actualQuantity;
    item.discrepancy = command.data.actualQuantity - item.expectedQuantity;

    if (item.discrepancy > 0) {
      item.discrepancyType = DiscrepancyType.SURPLUS;
    } else if (item.discrepancy < 0) {
      item.discrepancyType = DiscrepancyType.SHORTAGE;
    } else {
      item.discrepancyType = DiscrepancyType.NONE;
    }

    item.status = AuditItemStatus.COUNTED;
    item.countedBy = new Types.ObjectId(command.data.countedBy.toString());
    item.countedAt = new Date();

    if (command.data.comment) {
      item.comment = command.data.comment;
    }
    if (command.data.photos?.length) {
      item.photos = [...item.photos, ...command.data.photos];
    }

    // Обновляем счётчики
    if (wasPending) {
      audit.countedItems++;
    }

    this.recalculateTotals(audit);

    return audit.save();
  }

  async bulkCountItems(
    command: Commands.BulkCountAuditItemsCommand,
  ): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new Error('Can only count IN_PROGRESS audits');
    }

    const now = new Date();

    for (const itemData of command.items) {
      if (itemData.itemIndex < 0 || itemData.itemIndex >= audit.items.length) {
        continue;
      }

      const item = audit.items[itemData.itemIndex];
      const wasPending = item.status === AuditItemStatus.PENDING;

      item.actualQuantity = itemData.actualQuantity;
      item.discrepancy = itemData.actualQuantity - item.expectedQuantity;

      if (item.discrepancy > 0) {
        item.discrepancyType = DiscrepancyType.SURPLUS;
      } else if (item.discrepancy < 0) {
        item.discrepancyType = DiscrepancyType.SHORTAGE;
      } else {
        item.discrepancyType = DiscrepancyType.NONE;
      }

      item.status = AuditItemStatus.COUNTED;
      item.countedBy = new Types.ObjectId(command.countedBy.toString());
      item.countedAt = now;

      if (itemData.comment) {
        item.comment = itemData.comment;
      }

      if (wasPending) {
        audit.countedItems++;
      }
    }

    this.recalculateTotals(audit);

    return audit.save();
  }

  async skipItem(command: Commands.SkipAuditItemCommand): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new Error('Can only skip in IN_PROGRESS audits');
    }

    if (command.itemIndex < 0 || command.itemIndex >= audit.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = audit.items[command.itemIndex];
    item.status = AuditItemStatus.SKIPPED;
    if (command.data?.reason) {
      item.comment = command.data.reason;
    }

    return audit.save();
  }

  async complete(command: Commands.CompleteAuditCommand): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.IN_PROGRESS) {
      throw new Error('Can only complete IN_PROGRESS audits');
    }

    audit.status = AuditStatus.COMPLETED;
    audit.completedBy = new Types.ObjectId(command.data.completedBy.toString());
    audit.completedAt = new Date();
    audit.applyCorrections = command.data.applyCorrections ?? false;

    await audit.save();

    // Если нужно применить корректировки
    if (command.data.applyCorrections) {
      await this.applyCorrections(
        new Commands.ApplyAuditCorrectionsCommand(audit._id, {
          appliedBy: command.data.completedBy,
        }),
      );
      return this.auditModel.findById(audit._id) as Promise<Audit>;
    }

    return audit;
  }

  async applyCorrections(
    command: Commands.ApplyAuditCorrectionsCommand,
  ): Promise<ApplyCorrectionsResult> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status !== AuditStatus.COMPLETED) {
      throw new Error('Can only apply corrections to COMPLETED audits');
    }

    const surplusAdjustments: ApplyCorrectionsResult['surplusAdjustments'] = [];
    const shortageAdjustments: ApplyCorrectionsResult['shortageAdjustments'] = [];

    for (let i = 0; i < audit.items.length; i++) {
      const item = audit.items[i];

      if (
        item.status !== AuditItemStatus.COUNTED ||
        item.discrepancy === undefined ||
        item.discrepancy === 0
      ) {
        continue;
      }

      // Применяем корректировку к BatchLocation
      await this.batchLocationPort.changeQuantity(
        new BatchLocationCommands.ChangeQuantityCommand(item.batchLocation, {
          quantityDelta: item.discrepancy,
          reason: QuantityChangeReason.INVENTORY_ADJUSTMENT,
          referenceId: audit._id,
          referenceType: 'Audit',
          comment: `Audit ${audit.documentNumber}: ${item.discrepancy > 0 ? 'surplus' : 'shortage'}`,
        }),
      );

      if (item.discrepancy > 0) {
        surplusAdjustments.push({
          itemIndex: i,
          batchLocationId: item.batchLocation.toHexString(),
          adjustment: item.discrepancy,
        });
      } else {
        shortageAdjustments.push({
          itemIndex: i,
          batchLocationId: item.batchLocation.toHexString(),
          adjustment: item.discrepancy,
        });
      }
    }

    audit.status = AuditStatus.APPLIED;
    audit.appliedBy = new Types.ObjectId(command.data.appliedBy.toString());
    audit.appliedAt = new Date();
    await audit.save();

    return { audit, surplusAdjustments, shortageAdjustments };
  }

  async cancel(command: Commands.CancelAuditCommand): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (audit.status === AuditStatus.APPLIED) {
      throw new Error('Cannot cancel APPLIED audits');
    }

    audit.status = AuditStatus.CANCELLED;
    if (command.data?.reason) {
      audit.cancellationReason = command.data.reason;
    }

    return audit.save();
  }

  async addItemPhotos(
    command: Commands.AddAuditItemPhotosCommand,
  ): Promise<Audit> {
    const audit = await this.auditModel.findById(command.auditId);
    if (!audit) {
      throw new Error(`Audit ${command.auditId} not found`);
    }

    if (command.itemIndex < 0 || command.itemIndex >= audit.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    audit.items[command.itemIndex].photos.push(...command.photos);
    return audit.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetAuditByIdQuery): Promise<Audit | null> {
    return this.auditModel.findById(query.auditId);
  }

  async getByDocumentNumber(
    query: Queries.GetAuditByDocumentNumberQuery,
  ): Promise<Audit | null> {
    return this.auditModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      documentNumber: query.documentNumber,
    });
  }

  async getBySeller(
    query: Queries.GetAuditsBySellerQuery,
  ): Promise<{ items: Audit[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.locationType) {
      filter.locationType = query.data.locationType;
    }

    if (query.data.locationId) {
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      filter[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const sortField = query.data.sortBy || 'createdAt';
    const sortOrder = query.data.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.auditModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetAuditsForLocationQuery,
  ): Promise<{ items: Audit[]; total: number }> {
    const field =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const filter: any = {
      locationType: query.data.locationType,
      [field]: new Types.ObjectId(query.data.locationId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.auditModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getActive(query: Queries.GetActiveAuditsQuery): Promise<Audit[]> {
    const filter: any = {
      status: AuditStatus.IN_PROGRESS,
    };

    if (query.data?.sellerId) {
      filter.seller = new Types.ObjectId(query.data.sellerId.toString());
    }

    if (query.data?.locationType && query.data?.locationId) {
      filter.locationType = query.data.locationType;
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      filter[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    return this.auditModel.find(filter).sort({ startedAt: -1 });
  }

  async getStatistics(
    query: Queries.GetAuditStatisticsQuery,
  ): Promise<AuditStatistics> {
    const match: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.locationType) {
      match.locationType = query.data.locationType;
    }

    if (query.data.locationId) {
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      match[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      match.createdAt = {};
      if (query.data.fromDate) match.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) match.createdAt.$lte = query.data.toDate;
    }

    const [totals, byStatus] = await Promise.all([
      this.auditModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAudits: { $sum: 1 },
            completedAudits: {
              $sum: {
                $cond: [
                  { $in: ['$status', [AuditStatus.COMPLETED, AuditStatus.APPLIED]] },
                  1,
                  0,
                ],
              },
            },
            totalDiscrepancies: { $sum: '$discrepancyItems' },
            totalSurplus: { $sum: '$totalSurplus' },
            totalShortage: { $sum: '$totalShortage' },
          },
        },
      ]),
      this.auditModel.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const total = totals[0] || {
      totalAudits: 0,
      completedAudits: 0,
      totalDiscrepancies: 0,
      totalSurplus: 0,
      totalShortage: 0,
    };

    return {
      totalAudits: total.totalAudits,
      completedAudits: total.completedAudits,
      totalDiscrepancies: total.totalDiscrepancies,
      totalSurplus: total.totalSurplus,
      totalShortage: Math.abs(total.totalShortage),
      byStatus: byStatus.map((s) => ({
        status: s._id as AuditStatus,
        count: s.count,
      })),
      averageDiscrepancyRate:
        total.totalAudits > 0
          ? total.totalDiscrepancies / total.totalAudits
          : 0,
    };
  }

  async getProductHistory(
    query: Queries.GetProductAuditHistoryQuery,
  ): Promise<Audit[]> {
    const filter: any = {
      'items.product': new Types.ObjectId(query.data.productId.toString()),
      status: { $in: [AuditStatus.COMPLETED, AuditStatus.APPLIED] },
    };

    if (query.data.sellerId) {
      filter.seller = new Types.ObjectId(query.data.sellerId.toString());
    }

    if (query.data.locationType && query.data.locationId) {
      filter.locationType = query.data.locationType;
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      filter[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    return this.auditModel
      .find(filter)
      .sort({ completedAt: -1 })
      .limit(query.data.limit || 10);
  }

  async search(
    query: Queries.SearchAuditsQuery,
  ): Promise<{ items: Audit[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { documentNumber: { $regex: query.data.search, $options: 'i' } },
        { comment: { $regex: query.data.search, $options: 'i' } },
      ];
    }

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.auditModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async generateDocumentNumber(sellerId: string): Promise<string> {
    const today = new Date();
    const prefix = `AUD-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastAudit = await this.auditModel
      .findOne({
        seller: new Types.ObjectId(sellerId),
        documentNumber: { $regex: `^${prefix}` },
      })
      .sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastAudit) {
      const lastNum = parseInt(
        lastAudit.documentNumber.split('-').pop() || '0',
        10,
      );
      sequence = lastNum + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private recalculateTotals(audit: Audit): void {
    audit.discrepancyItems = 0;
    audit.totalSurplus = 0;
    audit.totalShortage = 0;

    for (const item of audit.items) {
      if (
        item.status === AuditItemStatus.COUNTED &&
        item.discrepancy !== undefined &&
        item.discrepancy !== 0
      ) {
        audit.discrepancyItems++;
        if (item.discrepancy > 0) {
          audit.totalSurplus += item.discrepancy;
        } else {
          audit.totalShortage += Math.abs(item.discrepancy);
        }
      }
    }
  }
}
