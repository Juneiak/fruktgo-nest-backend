import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Transfer, TransferModel } from './transfer.schema';
import { TransferPort, SendTransferResult, ReceiveTransferResult } from './transfer.port';
import { TransferStatus, TransferType } from './transfer.enums';
import { LocationType } from '../../batch-location/batch-location.enums';
import * as Commands from './transfer.commands';
import * as Queries from './transfer.queries';
import { BATCH_PORT, BatchPort, BatchCommands } from '../../batch';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
  BatchLocationQueries,
} from '../../batch-location';
import { ShelfLifeCalculatorService } from '../../core';

@Injectable()
export class TransferService implements TransferPort {
  constructor(
    @InjectModel(Transfer.name)
    private readonly transferModel: TransferModel,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateTransferCommand): Promise<Transfer> {
    const { data } = command;

    const documentNumber = await this.generateDocumentNumber(
      data.seller.toString(),
    );

    // Определяем тип перемещения
    let type = TransferType.INTERNAL;
    if (
      data.sourceType === LocationType.WAREHOUSE &&
      data.targetType === LocationType.SHOP
    ) {
      type = TransferType.WAREHOUSE_TO_SHOP;
    } else if (
      data.sourceType === LocationType.SHOP &&
      data.targetType === LocationType.WAREHOUSE
    ) {
      type = TransferType.SHOP_TO_WAREHOUSE;
    } else if (
      data.sourceType === LocationType.SHOP &&
      data.targetType === LocationType.SHOP
    ) {
      type = TransferType.SHOP_TO_SHOP;
    }

    const transfer = new this.transferModel({
      seller: new Types.ObjectId(data.seller.toString()),
      documentNumber,
      type,
      status: TransferStatus.DRAFT,
      sourceType: data.sourceType,
      sourceShop:
        data.sourceType === LocationType.SHOP
          ? new Types.ObjectId(data.sourceId.toString())
          : undefined,
      sourceWarehouse:
        data.sourceType === LocationType.WAREHOUSE
          ? new Types.ObjectId(data.sourceId.toString())
          : undefined,
      sourceName: data.sourceName,
      targetType: data.targetType,
      targetShop:
        data.targetType === LocationType.SHOP
          ? new Types.ObjectId(data.targetId.toString())
          : undefined,
      targetWarehouse:
        data.targetType === LocationType.WAREHOUSE
          ? new Types.ObjectId(data.targetId.toString())
          : undefined,
      targetName: data.targetName,
      items: data.items.map((item) => ({
        batch: new Types.ObjectId(item.batch.toString()),
        product: new Types.ObjectId(item.product.toString()),
        quantity: item.quantity,
      })),
      comment: data.comment,
      createdBy: data.createdBy
        ? new Types.ObjectId(data.createdBy.toString())
        : undefined,
    });

    return transfer.save();
  }

  async addItem(command: Commands.AddTransferItemCommand): Promise<Transfer> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error('Can only modify DRAFT transfers');
    }

    transfer.items.push({
      batch: new Types.ObjectId(command.item.batch.toString()),
      product: new Types.ObjectId(command.item.product.toString()),
      quantity: command.item.quantity,
    });

    return transfer.save();
  }

  async updateItem(
    command: Commands.UpdateTransferItemCommand,
  ): Promise<Transfer> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error('Can only modify DRAFT transfers');
    }

    if (command.itemIndex < 0 || command.itemIndex >= transfer.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    if (command.data.quantity !== undefined) {
      transfer.items[command.itemIndex].quantity = command.data.quantity;
    }

    return transfer.save();
  }

  async removeItem(
    command: Commands.RemoveTransferItemCommand,
  ): Promise<Transfer> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error('Can only modify DRAFT transfers');
    }

    if (command.itemIndex < 0 || command.itemIndex >= transfer.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    transfer.items.splice(command.itemIndex, 1);
    return transfer.save();
  }

  async send(command: Commands.SendTransferCommand): Promise<SendTransferResult> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new Error('Can only send DRAFT transfers');
    }

    if (transfer.items.length === 0) {
      throw new Error('Cannot send empty transfer');
    }

    const now = new Date();
    const recalculatedItems: SendTransferResult['recalculatedItems'] = [];

    // Обрабатываем каждую позицию
    for (let i = 0; i < transfer.items.length; i++) {
      const item = transfer.items[i];

      // Уточнённое количество (если передано)
      const sentQty =
        command.data.itemQuantities?.find((q) => q.itemIndex === i)
          ?.sentQuantity ?? item.quantity;

      item.sentQuantity = sentQty;

      // Списываем из BatchLocation источника
      const sourceLocationId =
        transfer.sourceType === LocationType.SHOP
          ? transfer.sourceShop
          : transfer.sourceWarehouse;

      const batchLocation = await this.batchLocationPort.getBatchInLocation(
        new BatchLocationQueries.GetBatchInLocationQuery({
          batchId: item.batch,
          locationType: transfer.sourceType,
          locationId: sourceLocationId!,
        }),
      );

      if (!batchLocation) {
        throw new Error(`BatchLocation not found for batch ${item.batch}`);
      }

      if (batchLocation.quantity < sentQty) {
        throw new Error(
          `Insufficient quantity in source: ${batchLocation.quantity} < ${sentQty}`,
        );
      }

      // Рассчитываем новый срок для целевой локации
      // TODO: получить условия хранения целевой локации
      const newDegradationCoefficient = 1.0;
      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (batchLocation.effectiveExpirationDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const newFreshness = Math.max(
        0,
        batchLocation.freshnessRemaining - 0.1, // небольшая потеря при перемещении
      );
      const newExpiration = new Date(
        now.getTime() + daysRemaining * 24 * 60 * 60 * 1000,
      );

      item.newEffectiveExpiration = newExpiration;
      item.newFreshnessRemaining = newFreshness;

      recalculatedItems.push({
        itemIndex: i,
        newEffectiveExpiration: newExpiration,
        newFreshnessRemaining: newFreshness,
      });

      // Уменьшаем количество в источнике
      await this.batchLocationPort.changeQuantity(
        new BatchLocationCommands.ChangeQuantityCommand(batchLocation._id, {
          quantityDelta: -sentQty,
          reason: 'TRANSFER_OUT' as any,
          referenceId: transfer._id,
          referenceType: 'Transfer',
        }),
      );
    }

    // Обновляем статус
    transfer.status = TransferStatus.SENT;
    transfer.sentBy = new Types.ObjectId(command.data.sentBy.toString());
    transfer.sentAt = now;

    await transfer.save();

    return { transfer, recalculatedItems };
  }

  async receive(
    command: Commands.ReceiveTransferCommand,
  ): Promise<ReceiveTransferResult> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status !== TransferStatus.SENT) {
      throw new Error('Can only receive SENT transfers');
    }

    const now = new Date();
    const updatedBatchLocations: ReceiveTransferResult['updatedBatchLocations'] =
      [];

    // Обрабатываем каждую позицию
    for (let i = 0; i < transfer.items.length; i++) {
      const item = transfer.items[i];
      const sentQty = item.sentQuantity ?? item.quantity;

      // Уточнённое количество (если передано)
      const receivedQty =
        command.data.itemQuantities?.find((q) => q.itemIndex === i)
          ?.receivedQuantity ?? sentQty;

      const comment = command.data.itemQuantities?.find(
        (q) => q.itemIndex === i,
      )?.comment;

      item.receivedQuantity = receivedQty;
      if (comment) item.comment = comment;

      if (receivedQty <= 0) continue;

      // Перемещаем в целевую локацию
      const targetLocationId =
        transfer.targetType === LocationType.SHOP
          ? transfer.targetShop
          : transfer.targetWarehouse;

      // Проверяем, есть ли уже BatchLocation в целевой локации
      let targetBL = await this.batchLocationPort.getBatchInLocation(
        new BatchLocationQueries.GetBatchInLocationQuery({
          batchId: item.batch,
          locationType: transfer.targetType,
          locationId: targetLocationId!,
        }),
      );

      if (targetBL) {
        // Увеличиваем количество
        await this.batchLocationPort.changeQuantity(
          new BatchLocationCommands.ChangeQuantityCommand(targetBL._id, {
            quantityDelta: receivedQty,
            reason: 'TRANSFER_IN' as any,
            referenceId: transfer._id,
            referenceType: 'Transfer',
          }),
        );

        updatedBatchLocations.push({
          batchId: item.batch.toHexString(),
          batchLocationId: targetBL._id.toHexString(),
          quantity: receivedQty,
        });
      } else {
        // Создаём новый BatchLocation
        const batch = await this.batchPort.getById(
          new (await import('../../batch')).BatchQueries.GetBatchByIdQuery(
            item.batch,
          ),
        );

        if (!batch) {
          throw new Error(`Batch ${item.batch} not found`);
        }

        targetBL = await this.batchLocationPort.create(
          new BatchLocationCommands.CreateBatchLocationCommand({
            batch: item.batch,
            seller: transfer.seller,
            product: item.product,
            locationType: transfer.targetType,
            shop:
              transfer.targetType === LocationType.SHOP
                ? transfer.targetShop
                : undefined,
            warehouse:
              transfer.targetType === LocationType.WAREHOUSE
                ? transfer.targetWarehouse
                : undefined,
            locationName: transfer.targetName,
            quantity: receivedQty,
            degradationCoefficient: 1.0,
            arrivedAt: now,
            effectiveExpirationDate:
              item.newEffectiveExpiration ?? batch.effectiveExpirationDate,
            freshnessRemaining:
              item.newFreshnessRemaining ?? batch.freshnessRemaining,
            purchasePrice: batch.purchasePrice,
          }),
        );

        updatedBatchLocations.push({
          batchId: item.batch.toHexString(),
          batchLocationId: targetBL._id.toHexString(),
          quantity: receivedQty,
        });
      }

      // Обновляем Batch — текущую локацию и историю
      await this.batchPort.moveToLocation(
        new BatchCommands.MoveBatchToLocationCommand(item.batch, {
          newLocation: {
            locationType: transfer.targetType,
            locationId: targetLocationId!,
            locationName: transfer.targetName,
            degradationCoefficient: 1.0,
          },
          moveDate: now,
          newFreshnessRemaining: item.newFreshnessRemaining ?? 5,
          newEffectiveExpirationDate:
            item.newEffectiveExpiration ?? new Date(),
        }),
      );
    }

    // Обновляем статус
    transfer.status = TransferStatus.RECEIVED;
    transfer.receivedBy = new Types.ObjectId(command.data.receivedBy.toString());
    transfer.receivedAt = now;

    await transfer.save();

    return { transfer, updatedBatchLocations };
  }

  async cancel(command: Commands.CancelTransferCommand): Promise<Transfer> {
    const transfer = await this.transferModel.findById(command.transferId);
    if (!transfer) {
      throw new Error(`Transfer ${command.transferId} not found`);
    }

    if (transfer.status === TransferStatus.RECEIVED) {
      throw new Error('Cannot cancel RECEIVED transfers');
    }

    // Если был SENT — возвращаем товар в источник
    if (transfer.status === TransferStatus.SENT) {
      for (const item of transfer.items) {
        const sourceLocationId =
          transfer.sourceType === LocationType.SHOP
            ? transfer.sourceShop
            : transfer.sourceWarehouse;

        const batchLocation = await this.batchLocationPort.getBatchInLocation(
          new BatchLocationQueries.GetBatchInLocationQuery({
            batchId: item.batch,
            locationType: transfer.sourceType,
            locationId: sourceLocationId!,
          }),
        );

        if (batchLocation) {
          await this.batchLocationPort.changeQuantity(
            new BatchLocationCommands.ChangeQuantityCommand(batchLocation._id, {
              quantityDelta: item.sentQuantity ?? item.quantity,
              reason: 'TRANSFER_IN' as any,
              referenceId: transfer._id,
              referenceType: 'Transfer',
              comment: 'Transfer cancelled - returning to source',
            }),
          );
        }
      }
    }

    transfer.status = TransferStatus.CANCELLED;
    transfer.cancellationReason = command.data?.reason;

    return transfer.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetTransferByIdQuery): Promise<Transfer | null> {
    return this.transferModel.findById(query.transferId);
  }

  async getByDocumentNumber(
    query: Queries.GetTransferByDocumentNumberQuery,
  ): Promise<Transfer | null> {
    return this.transferModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      documentNumber: query.documentNumber,
    });
  }

  async getBySeller(
    query: Queries.GetTransfersBySellerQuery,
  ): Promise<{ items: Transfer[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.type) {
      filter.type = query.data.type;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const sortField = query.data.sortBy || 'createdAt';
    const sortOrder = query.data.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.transferModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.transferModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetTransfersForLocationQuery,
  ): Promise<{ items: Transfer[]; total: number }> {
    const field =
      query.data.locationType === LocationType.SHOP ? 'Shop' : 'Warehouse';

    let filter: any = {};

    if (query.data.direction === 'incoming') {
      filter[`target${field}`] = new Types.ObjectId(
        query.data.locationId.toString(),
      );
      filter.targetType = query.data.locationType;
    } else if (query.data.direction === 'outgoing') {
      filter[`source${field}`] = new Types.ObjectId(
        query.data.locationId.toString(),
      );
      filter.sourceType = query.data.locationType;
    } else {
      filter.$or = [
        {
          [`target${field}`]: new Types.ObjectId(
            query.data.locationId.toString(),
          ),
          targetType: query.data.locationType,
        },
        {
          [`source${field}`]: new Types.ObjectId(
            query.data.locationId.toString(),
          ),
          sourceType: query.data.locationType,
        },
      ];
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
      this.transferModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.transferModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getPending(query: Queries.GetPendingTransfersQuery): Promise<Transfer[]> {
    const field =
      query.data.locationType === LocationType.SHOP ? 'Shop' : 'Warehouse';

    return this.transferModel
      .find({
        [`target${field}`]: new Types.ObjectId(query.data.locationId.toString()),
        targetType: query.data.locationType,
        status: TransferStatus.SENT,
      })
      .sort({ sentAt: 1 });
  }

  async search(
    query: Queries.SearchTransfersQuery,
  ): Promise<{ items: Transfer[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { documentNumber: { $regex: query.data.search, $options: 'i' } },
        { sourceName: { $regex: query.data.search, $options: 'i' } },
        { targetName: { $regex: query.data.search, $options: 'i' } },
      ];
    }

    if (query.data.status) {
      filter.status = Array.isArray(query.data.status)
        ? { $in: query.data.status }
        : query.data.status;
    }

    if (query.data.type) {
      filter.type = query.data.type;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.transferModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.transferModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async generateDocumentNumber(sellerId: string): Promise<string> {
    const today = new Date();
    const prefix = `TRF-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastTransfer = await this.transferModel
      .findOne({
        seller: new Types.ObjectId(sellerId),
        documentNumber: { $regex: `^${prefix}` },
      })
      .sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastTransfer) {
      const lastNum = parseInt(
        lastTransfer.documentNumber.split('-').pop() || '0',
        10,
      );
      sequence = lastNum + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
