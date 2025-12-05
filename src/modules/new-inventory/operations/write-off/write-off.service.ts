import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WriteOff, WriteOffModel } from './write-off.schema';
import { WriteOffPort, ConfirmWriteOffResult, WriteOffStatistics } from './write-off.port';
import { WriteOffStatus } from './write-off.enums';
import { WriteOffReason } from '../../batch/batch.enums';
import { LocationType, QuantityChangeReason } from '../../batch-location/batch-location.enums';
import * as Commands from './write-off.commands';
import * as Queries from './write-off.queries';
import { BATCH_PORT, BatchPort, BatchQueries, BatchStatus } from '../../batch';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
  BatchLocationQueries,
} from '../../batch-location';

@Injectable()
export class WriteOffService implements WriteOffPort {
  constructor(
    @InjectModel(WriteOff.name)
    private readonly writeOffModel: WriteOffModel,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateWriteOffCommand): Promise<WriteOff> {
    const { data } = command;

    const documentNumber = await this.generateDocumentNumber(
      data.seller.toString(),
    );

    const writeOff = new this.writeOffModel({
      seller: new Types.ObjectId(data.seller.toString()),
      documentNumber,
      status: WriteOffStatus.DRAFT,
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
      reason: data.reason,
      items: data.items.map((item) => ({
        batch: new Types.ObjectId(item.batch.toString()),
        product: new Types.ObjectId(item.product.toString()),
        quantity: item.quantity,
        reason: item.reason,
        purchasePrice: item.purchasePrice,
        comment: item.comment,
        photos: item.photos || [],
      })),
      comment: data.comment,
      documentPhotos: data.documentPhotos || [],
      createdBy: data.createdBy
        ? new Types.ObjectId(data.createdBy.toString())
        : undefined,
    });

    // Рассчитываем общую сумму потерь
    writeOff.totalLoss = writeOff.items.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * item.quantity,
      0,
    );

    return writeOff.save();
  }

  async addItem(command: Commands.AddWriteOffItemCommand): Promise<WriteOff> {
    const writeOff = await this.writeOffModel.findById(command.writeOffId);
    if (!writeOff) {
      throw new Error(`WriteOff ${command.writeOffId} not found`);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw new Error('Can only modify DRAFT write-offs');
    }

    writeOff.items.push({
      batch: new Types.ObjectId(command.item.batch.toString()),
      product: new Types.ObjectId(command.item.product.toString()),
      quantity: command.item.quantity,
      reason: command.item.reason,
      purchasePrice: command.item.purchasePrice,
      comment: command.item.comment,
      photos: command.item.photos || [],
    });

    // Пересчитываем потери
    writeOff.totalLoss = writeOff.items.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * item.quantity,
      0,
    );

    return writeOff.save();
  }

  async updateItem(
    command: Commands.UpdateWriteOffItemCommand,
  ): Promise<WriteOff> {
    const writeOff = await this.writeOffModel.findById(command.writeOffId);
    if (!writeOff) {
      throw new Error(`WriteOff ${command.writeOffId} not found`);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw new Error('Can only modify DRAFT write-offs');
    }

    if (command.itemIndex < 0 || command.itemIndex >= writeOff.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = writeOff.items[command.itemIndex];
    if (command.data.quantity !== undefined) {
      item.quantity = command.data.quantity;
    }
    if (command.data.reason !== undefined) {
      item.reason = command.data.reason;
    }
    if (command.data.comment !== undefined) {
      item.comment = command.data.comment;
    }
    if (command.data.photos !== undefined) {
      item.photos = command.data.photos;
    }

    // Пересчитываем потери
    writeOff.totalLoss = writeOff.items.reduce(
      (sum, i) => sum + (i.purchasePrice || 0) * i.quantity,
      0,
    );

    return writeOff.save();
  }

  async removeItem(
    command: Commands.RemoveWriteOffItemCommand,
  ): Promise<WriteOff> {
    const writeOff = await this.writeOffModel.findById(command.writeOffId);
    if (!writeOff) {
      throw new Error(`WriteOff ${command.writeOffId} not found`);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw new Error('Can only modify DRAFT write-offs');
    }

    if (command.itemIndex < 0 || command.itemIndex >= writeOff.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    writeOff.items.splice(command.itemIndex, 1);

    // Пересчитываем потери
    writeOff.totalLoss = writeOff.items.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * item.quantity,
      0,
    );

    return writeOff.save();
  }

  async confirm(
    command: Commands.ConfirmWriteOffCommand,
  ): Promise<ConfirmWriteOffResult> {
    const writeOff = await this.writeOffModel.findById(command.writeOffId);
    if (!writeOff) {
      throw new Error(`WriteOff ${command.writeOffId} not found`);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw new Error('Can only confirm DRAFT write-offs');
    }

    if (writeOff.items.length === 0) {
      throw new Error('Cannot confirm empty write-off');
    }

    const now = new Date();
    const writtenOffBatches: ConfirmWriteOffResult['writtenOffBatches'] = [];
    let totalLoss = 0;

    const locationId =
      writeOff.locationType === LocationType.SHOP
        ? writeOff.shop
        : writeOff.warehouse;

    // Списываем каждую позицию
    for (const item of writeOff.items) {
      // Находим BatchLocation
      const batchLocation = await this.batchLocationPort.getBatchInLocation(
        new BatchLocationQueries.GetBatchInLocationQuery({
          batchId: item.batch,
          locationType: writeOff.locationType,
          locationId: locationId!,
        }),
      );

      if (!batchLocation) {
        throw new Error(`BatchLocation not found for batch ${item.batch}`);
      }

      if (batchLocation.quantity < item.quantity) {
        throw new Error(
          `Insufficient quantity: ${batchLocation.quantity} < ${item.quantity}`,
        );
      }

      // Списываем
      await this.batchLocationPort.changeQuantity(
        new BatchLocationCommands.ChangeQuantityCommand(batchLocation._id, {
          quantityDelta: -item.quantity,
          reason: QuantityChangeReason.WRITE_OFF,
          referenceId: writeOff._id,
          referenceType: 'WriteOff',
          comment: `Reason: ${item.reason || writeOff.reason}`,
        }),
      );

      const remainingQuantity = batchLocation.quantity - item.quantity;

      writtenOffBatches.push({
        batchId: item.batch.toHexString(),
        batchLocationId: batchLocation._id.toHexString(),
        quantity: item.quantity,
        remainingQuantity,
      });

      totalLoss += (item.purchasePrice || 0) * item.quantity;

      // Если это списание по причине EXPIRED — помечаем партию
      if (
        item.reason === WriteOffReason.EXPIRED ||
        writeOff.reason === WriteOffReason.EXPIRED
      ) {
        const batch = await this.batchPort.getById(
          new BatchQueries.GetBatchByIdQuery(item.batch),
        );
        if (batch && remainingQuantity <= 0) {
          // Если партия полностью списана — помечаем как EXPIRED
          await this.batchPort.markExpired(
            new (
              await import('../../batch')
            ).BatchCommands.MarkBatchExpiredCommand(item.batch),
          );
        }
      }
    }

    // Обновляем статус
    writeOff.status = WriteOffStatus.CONFIRMED;
    writeOff.confirmedBy = new Types.ObjectId(
      command.data.confirmedBy.toString(),
    );
    writeOff.confirmedAt = now;
    writeOff.totalLoss = totalLoss;

    await writeOff.save();

    return { writeOff, writtenOffBatches, totalLoss };
  }

  async cancel(command: Commands.CancelWriteOffCommand): Promise<WriteOff> {
    const writeOff = await this.writeOffModel.findById(command.writeOffId);
    if (!writeOff) {
      throw new Error(`WriteOff ${command.writeOffId} not found`);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw new Error('Can only cancel DRAFT write-offs');
    }

    writeOff.status = WriteOffStatus.CANCELLED;
    if (command.data?.reason) {
      writeOff.comment = `${writeOff.comment || ''}\nОтмена: ${command.data.reason}`.trim();
    }

    return writeOff.save();
  }

  async createAutoWriteOffForExpired(
    command: Commands.CreateAutoWriteOffForExpiredCommand,
  ): Promise<WriteOff | null> {
    const { data } = command;

    // Находим истёкшие партии в локации
    const expiredBatches = await this.batchPort.getExpiredForWriteOff(
      new BatchQueries.GetExpiredBatchesForWriteOffQuery({
        sellerId: data.seller,
      }),
    );

    // Фильтруем по локации
    const locationId = data.locationId.toString();
    const batchesInLocation = expiredBatches.filter((b) => {
      return b.currentLocation?.locationId?.toString() === locationId;
    });

    if (batchesInLocation.length === 0) {
      return null;
    }

    // Создаём списание
    const items: Commands.WriteOffItemInput[] = [];

    for (const batch of batchesInLocation) {
      // Получаем BatchLocation для получения текущего количества
      const batchLocation = await this.batchLocationPort.getBatchInLocation(
        new BatchLocationQueries.GetBatchInLocationQuery({
          batchId: batch._id,
          locationType: data.locationType,
          locationId: data.locationId,
        }),
      );

      if (batchLocation && batchLocation.quantity > 0) {
        items.push({
          batch: batch._id,
          product: batch.product,
          quantity: batchLocation.quantity,
          reason: WriteOffReason.EXPIRED,
          purchasePrice: batch.purchasePrice,
        });
      }
    }

    if (items.length === 0) {
      return null;
    }

    const writeOff = await this.create(
      new Commands.CreateWriteOffCommand({
        seller: data.seller,
        locationType: data.locationType,
        locationId: data.locationId,
        locationName: data.locationName,
        reason: WriteOffReason.EXPIRED,
        items,
        comment: 'Автоматическое списание истёкших товаров',
      }),
    );

    // Автоподтверждение
    if (data.autoConfirm) {
      await this.confirm(
        new Commands.ConfirmWriteOffCommand(writeOff._id, {
          confirmedBy: data.seller, // системное подтверждение
        }),
      );
    }

    return writeOff;
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetWriteOffByIdQuery): Promise<WriteOff | null> {
    return this.writeOffModel.findById(query.writeOffId);
  }

  async getByDocumentNumber(
    query: Queries.GetWriteOffByDocumentNumberQuery,
  ): Promise<WriteOff | null> {
    return this.writeOffModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      documentNumber: query.documentNumber,
    });
  }

  async getBySeller(
    query: Queries.GetWriteOffsBySellerQuery,
  ): Promise<{ items: WriteOff[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.reason) {
      filter.reason = query.data.reason;
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
      this.writeOffModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.writeOffModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetWriteOffsForLocationQuery,
  ): Promise<{ items: WriteOff[]; total: number }> {
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

    if (query.data.reason) {
      filter.reason = query.data.reason;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.writeOffModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.writeOffModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getStatistics(
    query: Queries.GetWriteOffStatisticsQuery,
  ): Promise<WriteOffStatistics> {
    const match: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
      status: WriteOffStatus.CONFIRMED,
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
      match.confirmedAt = {};
      if (query.data.fromDate) match.confirmedAt.$gte = query.data.fromDate;
      if (query.data.toDate) match.confirmedAt.$lte = query.data.toDate;
    }

    const [totals, byReason] = await Promise.all([
      this.writeOffModel.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalWriteOffs: { $addToSet: '$_id' },
            totalQuantity: { $sum: '$items.quantity' },
            totalLoss: {
              $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] },
            },
          },
        },
        {
          $project: {
            totalWriteOffs: { $size: '$totalWriteOffs' },
            totalQuantity: 1,
            totalLoss: 1,
          },
        },
      ]),
      this.writeOffModel.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.reason', '$reason'] },
            count: { $sum: 1 },
            quantity: { $sum: '$items.quantity' },
            loss: {
              $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] },
            },
          },
        },
        {
          $project: {
            reason: '$_id',
            count: 1,
            quantity: 1,
            loss: 1,
          },
        },
      ]),
    ]);

    const total = totals[0] || {
      totalWriteOffs: 0,
      totalQuantity: 0,
      totalLoss: 0,
    };

    return {
      totalWriteOffs: total.totalWriteOffs,
      totalQuantity: total.totalQuantity,
      totalLoss: total.totalLoss,
      byReason: byReason.map((r) => ({
        reason: r.reason as WriteOffReason,
        count: r.count,
        quantity: r.quantity,
        loss: r.loss || 0,
      })),
    };
  }

  async search(
    query: Queries.SearchWriteOffsQuery,
  ): Promise<{ items: WriteOff[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { documentNumber: { $regex: query.data.search, $options: 'i' } },
        { comment: { $regex: query.data.search, $options: 'i' } },
      ];
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.reason) {
      filter.reason = query.data.reason;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.writeOffModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.writeOffModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async generateDocumentNumber(sellerId: string): Promise<string> {
    const today = new Date();
    const prefix = `WO-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastWriteOff = await this.writeOffModel
      .findOne({
        seller: new Types.ObjectId(sellerId),
        documentNumber: { $regex: `^${prefix}` },
      })
      .sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastWriteOff) {
      const lastNum = parseInt(
        lastWriteOff.documentNumber.split('-').pop() || '0',
        10,
      );
      sequence = lastNum + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
