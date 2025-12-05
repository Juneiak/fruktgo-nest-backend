import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Receiving, ReceivingModel } from './receiving.schema';
import { ReceivingPort, ConfirmReceivingResult } from './receiving.port';
import { ReceivingStatus } from './receiving.enums';
import { LocationType } from '../../batch-location/batch-location.enums';
import * as Commands from './receiving.commands';
import * as Queries from './receiving.queries';
import { BATCH_PORT, BatchPort, BatchCommands } from '../../batch';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
} from '../../batch-location';
import { ShelfLifeCalculatorService } from '../../core';

@Injectable()
export class ReceivingService implements ReceivingPort {
  constructor(
    @InjectModel(Receiving.name)
    private readonly receivingModel: ReceivingModel,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(command: Commands.CreateReceivingCommand): Promise<Receiving> {
    const { data } = command;

    const documentNumber = await this.generateDocumentNumber(
      data.seller.toString(),
    );

    const receiving = new this.receivingModel({
      seller: new Types.ObjectId(data.seller.toString()),
      documentNumber,
      type: data.type,
      status: ReceivingStatus.DRAFT,
      destinationType: data.destinationType,
      destinationShop:
        data.destinationType === LocationType.SHOP
          ? new Types.ObjectId(data.destinationId.toString())
          : undefined,
      destinationWarehouse:
        data.destinationType === LocationType.WAREHOUSE
          ? new Types.ObjectId(data.destinationId.toString())
          : undefined,
      destinationName: data.destinationName,
      supplier: data.supplier,
      supplierInvoice: data.supplierInvoice,
      supplierInvoiceDate: data.supplierInvoiceDate,
      items: data.items.map((item) => ({
        product: new Types.ObjectId(item.product.toString()),
        expectedQuantity: item.expectedQuantity,
        actualQuantity: item.actualQuantity,
        expirationDate: item.expirationDate,
        productionDate: item.productionDate,
        supplierBatchNumber: item.supplierBatchNumber,
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

    // Рассчитываем общую сумму
    receiving.totalAmount = receiving.items.reduce((sum, item) => {
      const qty = item.actualQuantity ?? item.expectedQuantity;
      return sum + (item.purchasePrice || 0) * qty;
    }, 0);

    return receiving.save();
  }

  async update(command: Commands.UpdateReceivingCommand): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only update DRAFT receivings');
    }

    Object.assign(receiving, command.data);
    return receiving.save();
  }

  async addItem(command: Commands.AddReceivingItemCommand): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only modify DRAFT receivings');
    }

    receiving.items.push({
      product: new Types.ObjectId(command.item.product.toString()),
      expectedQuantity: command.item.expectedQuantity,
      actualQuantity: command.item.actualQuantity,
      expirationDate: command.item.expirationDate,
      productionDate: command.item.productionDate,
      supplierBatchNumber: command.item.supplierBatchNumber,
      purchasePrice: command.item.purchasePrice,
      comment: command.item.comment,
      photos: command.item.photos || [],
    });

    // Пересчитываем сумму
    receiving.totalAmount = receiving.items.reduce((sum, item) => {
      const qty = item.actualQuantity ?? item.expectedQuantity;
      return sum + (item.purchasePrice || 0) * qty;
    }, 0);

    return receiving.save();
  }

  async updateItem(
    command: Commands.UpdateReceivingItemCommand,
  ): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only modify DRAFT receivings');
    }

    if (command.itemIndex < 0 || command.itemIndex >= receiving.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = receiving.items[command.itemIndex];
    if (command.data.product) {
      item.product = new Types.ObjectId(command.data.product.toString());
    }
    if (command.data.expectedQuantity !== undefined) {
      item.expectedQuantity = command.data.expectedQuantity;
    }
    if (command.data.actualQuantity !== undefined) {
      item.actualQuantity = command.data.actualQuantity;
    }
    if (command.data.expirationDate) {
      item.expirationDate = command.data.expirationDate;
    }
    if (command.data.productionDate !== undefined) {
      item.productionDate = command.data.productionDate;
    }
    if (command.data.purchasePrice !== undefined) {
      item.purchasePrice = command.data.purchasePrice;
    }
    if (command.data.supplierBatchNumber !== undefined) {
      item.supplierBatchNumber = command.data.supplierBatchNumber;
    }
    if (command.data.comment !== undefined) {
      item.comment = command.data.comment;
    }

    // Пересчитываем сумму
    receiving.totalAmount = receiving.items.reduce((sum, i) => {
      const qty = i.actualQuantity ?? i.expectedQuantity;
      return sum + (i.purchasePrice || 0) * qty;
    }, 0);

    return receiving.save();
  }

  async removeItem(
    command: Commands.RemoveReceivingItemCommand,
  ): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only modify DRAFT receivings');
    }

    if (command.itemIndex < 0 || command.itemIndex >= receiving.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    receiving.items.splice(command.itemIndex, 1);

    // Пересчитываем сумму
    receiving.totalAmount = receiving.items.reduce((sum, item) => {
      const qty = item.actualQuantity ?? item.expectedQuantity;
      return sum + (item.purchasePrice || 0) * qty;
    }, 0);

    return receiving.save();
  }

  async updateActualQuantity(
    command: Commands.UpdateActualQuantityCommand,
  ): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only modify DRAFT receivings');
    }

    if (command.itemIndex < 0 || command.itemIndex >= receiving.items.length) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    receiving.items[command.itemIndex].actualQuantity = command.actualQuantity;

    // Пересчитываем сумму
    receiving.totalAmount = receiving.items.reduce((sum, item) => {
      const qty = item.actualQuantity ?? item.expectedQuantity;
      return sum + (item.purchasePrice || 0) * qty;
    }, 0);

    return receiving.save();
  }

  async confirm(
    command: Commands.ConfirmReceivingCommand,
  ): Promise<ConfirmReceivingResult> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only confirm DRAFT receivings');
    }

    if (receiving.items.length === 0) {
      throw new Error('Cannot confirm empty receiving');
    }

    const createdBatches: ConfirmReceivingResult['createdBatches'] = [];
    const now = new Date();

    // Определяем локацию
    const locationId =
      receiving.destinationType === LocationType.SHOP
        ? receiving.destinationShop
        : receiving.destinationWarehouse;

    // Создаём партии для каждой позиции
    for (let i = 0; i < receiving.items.length; i++) {
      const item = receiving.items[i];
      const quantity = item.actualQuantity ?? item.expectedQuantity;

      if (quantity <= 0) continue;

      // Рассчитываем начальную свежесть
      // TODO: получить Product.storageConditions для точного расчёта
      const baseShelfLifeDays = 14; // default
      const initialFreshness = this.shelfLifeCalculator.calculateInitialFreshness(
        { preset: 'GENERIC' as any, baseShelfLifeDays },
        item.expirationDate,
        now,
      );

      // Генерируем номер партии
      const batchNumber =
        item.supplierBatchNumber ||
        `${receiving.documentNumber}-${(i + 1).toString().padStart(3, '0')}`;

      // Создаём партию
      const batch = await this.batchPort.create(
        new BatchCommands.CreateBatchCommand({
          seller: receiving.seller,
          product: item.product,
          batchNumber,
          productionDate: item.productionDate,
          receivedAt: now,
          originalExpirationDate: item.expirationDate,
          effectiveExpirationDate: item.expirationDate,
          freshnessRemaining: Math.min(10, initialFreshness),
          initialFreshness: Math.min(10, initialFreshness),
          initialQuantity: quantity,
          currentQuantity: quantity,
          supplier: receiving.supplier,
          supplierInvoice: receiving.supplierInvoice,
          purchasePrice: item.purchasePrice,
          receivingId: receiving._id,
          currentLocation: {
            locationType: receiving.destinationType,
            locationId: locationId!,
            locationName: receiving.destinationName,
            arrivedAt: now,
            degradationCoefficient: 1.0, // TODO: рассчитать из условий локации
          },
        }),
      );

      // Создаём BatchLocation
      await this.batchLocationPort.create(
        new BatchLocationCommands.CreateBatchLocationCommand({
          batch: batch._id,
          seller: receiving.seller,
          product: item.product,
          locationType: receiving.destinationType,
          shop:
            receiving.destinationType === LocationType.SHOP
              ? receiving.destinationShop
              : undefined,
          warehouse:
            receiving.destinationType === LocationType.WAREHOUSE
              ? receiving.destinationWarehouse
              : undefined,
          locationName: receiving.destinationName,
          quantity,
          degradationCoefficient: 1.0,
          arrivedAt: now,
          effectiveExpirationDate: item.expirationDate,
          freshnessRemaining: Math.min(10, initialFreshness),
          purchasePrice: item.purchasePrice,
        }),
      );

      // Сохраняем ID партии в позиции
      item.createdBatchId = batch._id;

      createdBatches.push({
        batchId: batch._id.toHexString(),
        productId: item.product.toHexString(),
        quantity,
      });
    }

    // Обновляем статус приёмки
    receiving.status = ReceivingStatus.CONFIRMED;
    receiving.confirmedBy = new Types.ObjectId(
      command.data.confirmedBy.toString(),
    );
    receiving.confirmedAt = now;

    await receiving.save();

    return {
      receiving,
      createdBatches,
    };
  }

  async cancel(command: Commands.CancelReceivingCommand): Promise<Receiving> {
    const receiving = await this.receivingModel.findById(command.receivingId);
    if (!receiving) {
      throw new Error(`Receiving ${command.receivingId} not found`);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw new Error('Can only cancel DRAFT receivings');
    }

    receiving.status = ReceivingStatus.CANCELLED;
    if (command.data?.reason) {
      receiving.comment = `${receiving.comment || ''}\nОтмена: ${command.data.reason}`.trim();
    }

    return receiving.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetReceivingByIdQuery,
  ): Promise<Receiving | null> {
    return this.receivingModel.findById(query.receivingId);
  }

  async getByDocumentNumber(
    query: Queries.GetReceivingByDocumentNumberQuery,
  ): Promise<Receiving | null> {
    return this.receivingModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      documentNumber: query.documentNumber,
    });
  }

  async getBySeller(
    query: Queries.GetReceivingsBySellerQuery,
  ): Promise<{ items: Receiving[]; total: number }> {
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

    if (query.data.destinationType) {
      filter.destinationType = query.data.destinationType;
    }

    if (query.data.destinationId) {
      const field =
        query.data.destinationType === LocationType.SHOP
          ? 'destinationShop'
          : 'destinationWarehouse';
      filter[field] = new Types.ObjectId(query.data.destinationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const sortField = query.data.sortBy || 'createdAt';
    const sortOrder = query.data.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.receivingModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.receivingModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetReceivingsForLocationQuery,
  ): Promise<{ items: Receiving[]; total: number }> {
    const field =
      query.data.locationType === LocationType.SHOP
        ? 'destinationShop'
        : 'destinationWarehouse';

    const filter: any = {
      destinationType: query.data.locationType,
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
      this.receivingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.receivingModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async search(
    query: Queries.SearchReceivingsQuery,
  ): Promise<{ items: Receiving[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { documentNumber: { $regex: query.data.search, $options: 'i' } },
        { supplier: { $regex: query.data.search, $options: 'i' } },
        { supplierInvoice: { $regex: query.data.search, $options: 'i' } },
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

    if (query.data.supplier) {
      filter.supplier = { $regex: query.data.supplier, $options: 'i' };
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.receivingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.receivingModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getDrafts(query: Queries.GetDraftReceivingsQuery): Promise<Receiving[]> {
    return this.receivingModel
      .find({
        seller: new Types.ObjectId(query.sellerId.toString()),
        status: ReceivingStatus.DRAFT,
      })
      .sort({ createdAt: -1 })
      .limit(query.limit || 10);
  }

  async generateDocumentNumber(sellerId: string): Promise<string> {
    const today = new Date();
    const prefix = `RCV-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    // Находим последний номер с таким префиксом
    const lastReceiving = await this.receivingModel
      .findOne({
        seller: new Types.ObjectId(sellerId),
        documentNumber: { $regex: `^${prefix}` },
      })
      .sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastReceiving) {
      const lastNum = parseInt(lastReceiving.documentNumber.split('-').pop() || '0', 10);
      sequence = lastNum + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
