import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Return, ReturnModel } from './return.schema';
import { ReturnPort, CompleteReturnResult, ReturnStatistics } from './return.port';
import {
  ReturnType,
  ReturnStatus,
  ItemCondition,
  ReturnItemDecision,
} from './return.enums';
import { LocationType, QuantityChangeReason } from '../../batch-location/batch-location.enums';
import { WriteOffReason } from '../../batch/batch.enums';
import * as Commands from './return.commands';
import * as Queries from './return.queries';
import { BATCH_PORT, BatchPort, BatchQueries } from '../../batch';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
  BatchLocationQueries,
} from '../../batch-location';
import {
  WRITE_OFF_PORT,
  WriteOffPort,
  WriteOffCommands,
} from '../write-off';
import { ShelfLifeCalculatorService } from '../../core';

@Injectable()
export class ReturnService implements ReturnPort {
  constructor(
    @InjectModel(Return.name)
    private readonly returnModel: ReturnModel,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async createReturn(
    type: ReturnType,
    data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      order?: Types.ObjectId | string;
      receiving?: Types.ObjectId | string;
      supplier?: string;
      customerReturnReason?: any;
      deliveryReturnReason?: any;
      supplierReturnReason?: any;
      items: Commands.ReturnItemInput[];
      comment?: string;
      photos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ): Promise<Return> {
    const documentNumber = await this.generateDocumentNumber(
      data.seller.toString(),
      type,
    );

    const returnDoc = new this.returnModel({
      seller: new Types.ObjectId(data.seller.toString()),
      documentNumber,
      type,
      status: ReturnStatus.PENDING_INSPECTION,
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
      order: data.order ? new Types.ObjectId(data.order.toString()) : undefined,
      receiving: data.receiving
        ? new Types.ObjectId(data.receiving.toString())
        : undefined,
      supplier: data.supplier,
      customerReturnReason: data.customerReturnReason,
      deliveryReturnReason: data.deliveryReturnReason,
      supplierReturnReason: data.supplierReturnReason,
      items: data.items.map((item) => ({
        batch: new Types.ObjectId(item.batch.toString()),
        product: new Types.ObjectId(item.product.toString()),
        quantity: item.quantity,
        minutesOutOfControl: item.minutesOutOfControl || 0,
        purchasePrice: item.purchasePrice,
        comment: item.comment,
        photos: item.photos || [],
      })),
      comment: data.comment,
      photos: data.photos || [],
      createdBy: data.createdBy
        ? new Types.ObjectId(data.createdBy.toString())
        : undefined,
    });

    // Рассчитываем общую стоимость
    returnDoc.totalValue = returnDoc.items.reduce(
      (sum, item) => sum + (item.purchasePrice || 0) * item.quantity,
      0,
    );

    return returnDoc.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createCustomerReturn(
    command: Commands.CreateCustomerReturnCommand,
  ): Promise<Return> {
    return this.createReturn(ReturnType.CUSTOMER_RETURN, {
      ...command.data,
      customerReturnReason: command.data.reason,
    });
  }

  async createDeliveryReturn(
    command: Commands.CreateDeliveryReturnCommand,
  ): Promise<Return> {
    // Для delivery return — добавляем время доставки к minutesOutOfControl
    const items = command.data.items.map((item) => ({
      ...item,
      minutesOutOfControl:
        (item.minutesOutOfControl || 0) +
        (command.data.deliveryTimeMinutes || 0),
    }));

    return this.createReturn(ReturnType.DELIVERY_RETURN, {
      ...command.data,
      items,
      deliveryReturnReason: command.data.reason,
    });
  }

  async createSupplierReturn(
    command: Commands.CreateSupplierReturnCommand,
  ): Promise<Return> {
    return this.createReturn(ReturnType.SUPPLIER_RETURN, {
      ...command.data,
      supplierReturnReason: command.data.reason,
    });
  }

  async inspectItem(
    command: Commands.InspectReturnItemCommand,
  ): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.status !== ReturnStatus.PENDING_INSPECTION) {
      throw new Error('Can only inspect PENDING_INSPECTION returns');
    }

    if (
      command.itemIndex < 0 ||
      command.itemIndex >= returnDoc.items.length
    ) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = returnDoc.items[command.itemIndex];
    item.condition = command.data.condition;
    item.decision = command.data.decision;

    if (command.data.discountPercent !== undefined) {
      item.discountPercent = command.data.discountPercent;
    }
    if (command.data.minutesOutOfControl !== undefined) {
      item.minutesOutOfControl = command.data.minutesOutOfControl;
    }
    if (command.data.comment) {
      item.comment = command.data.comment;
    }
    if (command.data.photos?.length) {
      item.photos = [...(item.photos || []), ...command.data.photos];
    }

    // Рассчитываем новый срок годности на основе потери свежести
    if (
      item.decision === ReturnItemDecision.RETURN_TO_SHELF ||
      item.decision === ReturnItemDecision.RETURN_WITH_DISCOUNT
    ) {
      const batch = await this.batchPort.getById(
        new BatchQueries.GetBatchByIdQuery(item.batch),
      );

      if (batch) {
        // Потеря свежести: ~0.5 единицы за каждые 30 минут вне контроля
        const freshnessLoss = (item.minutesOutOfControl / 30) * 0.5;
        const newFreshness = Math.max(0, batch.freshnessRemaining - freshnessLoss);

        // Пересчитываем эффективный срок
        const now = new Date();
        const originalDaysRemaining = Math.max(
          0,
          Math.ceil(
            (batch.effectiveExpirationDate.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        const adjustedDays = Math.floor(
          originalDaysRemaining * (newFreshness / batch.freshnessRemaining),
        );
        const newExpiration = new Date(
          now.getTime() + adjustedDays * 24 * 60 * 60 * 1000,
        );

        item.newEffectiveExpiration = newExpiration;
        item.newFreshnessRemaining = newFreshness;
      }
    }

    return returnDoc.save();
  }

  async completeInspection(
    command: Commands.CompleteInspectionCommand,
  ): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.status !== ReturnStatus.PENDING_INSPECTION) {
      throw new Error('Can only inspect PENDING_INSPECTION returns');
    }

    const now = new Date();

    // Применяем осмотр для каждой позиции
    for (const inspection of command.data.inspections) {
      if (
        inspection.itemIndex < 0 ||
        inspection.itemIndex >= returnDoc.items.length
      ) {
        throw new Error(`Invalid item index ${inspection.itemIndex}`);
      }

      const item = returnDoc.items[inspection.itemIndex];
      item.condition = inspection.condition;
      item.decision = inspection.decision;

      if (inspection.discountPercent !== undefined) {
        item.discountPercent = inspection.discountPercent;
      }
      if (inspection.minutesOutOfControl !== undefined) {
        item.minutesOutOfControl = inspection.minutesOutOfControl;
      }
      if (inspection.comment) {
        item.comment = inspection.comment;
      }
      if (inspection.photos?.length) {
        item.photos = [...(item.photos || []), ...inspection.photos];
      }

      // Рассчитываем новый срок годности
      if (
        item.decision === ReturnItemDecision.RETURN_TO_SHELF ||
        item.decision === ReturnItemDecision.RETURN_WITH_DISCOUNT
      ) {
        const batch = await this.batchPort.getById(
          new BatchQueries.GetBatchByIdQuery(item.batch),
        );

        if (batch) {
          const freshnessLoss = (item.minutesOutOfControl / 30) * 0.5;
          const newFreshness = Math.max(
            0,
            batch.freshnessRemaining - freshnessLoss,
          );

          const originalDaysRemaining = Math.max(
            0,
            Math.ceil(
              (batch.effectiveExpirationDate.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          const adjustedDays = Math.floor(
            originalDaysRemaining * (newFreshness / batch.freshnessRemaining),
          );
          const newExpiration = new Date(
            now.getTime() + adjustedDays * 24 * 60 * 60 * 1000,
          );

          item.newEffectiveExpiration = newExpiration;
          item.newFreshnessRemaining = newFreshness;
        }
      }
    }

    // Проверяем, что все позиции осмотрены
    const allInspected = returnDoc.items.every(
      (item) => item.decision !== undefined,
    );
    if (!allInspected) {
      throw new Error('Not all items have been inspected');
    }

    returnDoc.status = ReturnStatus.INSPECTED;
    returnDoc.inspectedBy = new Types.ObjectId(
      command.data.inspectedBy.toString(),
    );
    returnDoc.inspectedAt = now;

    return returnDoc.save();
  }

  async complete(
    command: Commands.CompleteReturnCommand,
  ): Promise<CompleteReturnResult> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.status !== ReturnStatus.INSPECTED) {
      throw new Error('Can only complete INSPECTED returns');
    }

    const now = new Date();
    const returnedToShelf: CompleteReturnResult['returnedToShelf'] = [];
    const writtenOff: CompleteReturnResult['writtenOff'] = [];
    let totalLoss = 0;
    let totalReturnedToShelf = 0;

    const locationId =
      returnDoc.locationType === LocationType.SHOP
        ? returnDoc.shop
        : returnDoc.warehouse;

    // Обрабатываем каждую позицию согласно решению
    for (let i = 0; i < returnDoc.items.length; i++) {
      const item = returnDoc.items[i];

      switch (item.decision) {
        case ReturnItemDecision.RETURN_TO_SHELF:
        case ReturnItemDecision.RETURN_WITH_DISCOUNT: {
          // Создаём или обновляем BatchLocation
          let batchLocation = await this.batchLocationPort.getBatchInLocation(
            new BatchLocationQueries.GetBatchInLocationQuery({
              batchId: item.batch,
              locationType: returnDoc.locationType,
              locationId: locationId!,
            }),
          );

          if (batchLocation) {
            // Увеличиваем количество
            await this.batchLocationPort.changeQuantity(
              new BatchLocationCommands.ChangeQuantityCommand(
                batchLocation._id,
                {
                  quantityDelta: item.quantity,
                  reason: QuantityChangeReason.RETURN,
                  referenceId: returnDoc._id,
                  referenceType: 'Return',
                },
              ),
            );
          } else {
            // Создаём новый
            const batch = await this.batchPort.getById(
              new BatchQueries.GetBatchByIdQuery(item.batch),
            );

            batchLocation = await this.batchLocationPort.create(
              new BatchLocationCommands.CreateBatchLocationCommand({
                batch: item.batch,
                seller: returnDoc.seller,
                product: item.product,
                locationType: returnDoc.locationType,
                shop:
                  returnDoc.locationType === LocationType.SHOP
                    ? returnDoc.shop
                    : undefined,
                warehouse:
                  returnDoc.locationType === LocationType.WAREHOUSE
                    ? returnDoc.warehouse
                    : undefined,
                locationName: returnDoc.locationName,
                quantity: item.quantity,
                degradationCoefficient: 1.0,
                arrivedAt: now,
                effectiveExpirationDate:
                  item.newEffectiveExpiration ??
                  batch?.effectiveExpirationDate ??
                  new Date(),
                freshnessRemaining:
                  item.newFreshnessRemaining ?? batch?.freshnessRemaining ?? 5,
                purchasePrice: item.purchasePrice,
              }),
            );
          }

          returnedToShelf.push({
            itemIndex: i,
            batchId: item.batch.toHexString(),
            batchLocationId: batchLocation._id.toHexString(),
            quantity: item.quantity,
          });

          totalReturnedToShelf += (item.purchasePrice || 0) * item.quantity;

          // Если со скидкой — помечаем партию
          if (item.decision === ReturnItemDecision.RETURN_WITH_DISCOUNT) {
            // TODO: Пометить партию для скидки (в будущих фазах)
          }
          break;
        }

        case ReturnItemDecision.WRITE_OFF: {
          // Создаём списание
          const writeOff = await this.writeOffPort.create(
            new WriteOffCommands.CreateWriteOffCommand({
              seller: returnDoc.seller,
              locationType: returnDoc.locationType,
              locationId: locationId!,
              locationName: returnDoc.locationName,
              reason: WriteOffReason.QUALITY_ISSUE,
              items: [
                {
                  batch: item.batch,
                  product: item.product,
                  quantity: item.quantity,
                  purchasePrice: item.purchasePrice,
                  comment: `Return: ${item.comment || 'Quality issue'}`,
                },
              ],
              comment: `Auto-created from Return ${returnDoc.documentNumber}`,
            }),
          );

          // Подтверждаем списание
          await this.writeOffPort.confirm(
            new WriteOffCommands.ConfirmWriteOffCommand(writeOff._id, {
              confirmedBy: command.data.completedBy,
            }),
          );

          item.createdWriteOffId = writeOff._id;

          writtenOff.push({
            itemIndex: i,
            batchId: item.batch.toHexString(),
            writeOffId: writeOff._id.toHexString(),
            quantity: item.quantity,
          });

          totalLoss += (item.purchasePrice || 0) * item.quantity;
          break;
        }

        case ReturnItemDecision.PENDING_SUPPLIER:
          // Для SUPPLIER_RETURN — ждём ответа поставщика
          break;
      }
    }

    // Обновляем статус
    returnDoc.status = ReturnStatus.COMPLETED;
    returnDoc.completedBy = new Types.ObjectId(
      command.data.completedBy.toString(),
    );
    returnDoc.completedAt = now;
    returnDoc.totalLoss = totalLoss;
    returnDoc.totalReturnedToShelf = totalReturnedToShelf;

    await returnDoc.save();

    return { return: returnDoc, returnedToShelf, writtenOff, totalLoss, totalReturnedToShelf };
  }

  async rejectSupplierReturn(
    command: Commands.RejectSupplierReturnCommand,
  ): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.type !== ReturnType.SUPPLIER_RETURN) {
      throw new Error('Only SUPPLIER_RETURN can be rejected');
    }

    if (
      returnDoc.status !== ReturnStatus.PENDING_INSPECTION &&
      returnDoc.status !== ReturnStatus.INSPECTED
    ) {
      throw new Error('Cannot reject in current status');
    }

    returnDoc.status = ReturnStatus.REJECTED;
    returnDoc.supplierResponse = command.data.supplierResponse;
    returnDoc.supplierRespondedAt = new Date();

    return returnDoc.save();
  }

  async approveSupplierReturn(
    command: Commands.ApproveSupplierReturnCommand,
  ): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.type !== ReturnType.SUPPLIER_RETURN) {
      throw new Error('Only SUPPLIER_RETURN can be approved');
    }

    if (returnDoc.status !== ReturnStatus.INSPECTED) {
      throw new Error('Can only approve INSPECTED returns');
    }

    returnDoc.supplierResponse = command.data.supplierResponse;
    returnDoc.supplierRespondedAt = new Date();

    // Переходим к завершению
    // Для SUPPLIER_RETURN все позиции списываются (товар уходит поставщику)
    const now = new Date();
    const locationId =
      returnDoc.locationType === LocationType.SHOP
        ? returnDoc.shop
        : returnDoc.warehouse;

    for (const item of returnDoc.items) {
      // Списываем товар (уходит поставщику)
      const batchLocation = await this.batchLocationPort.getBatchInLocation(
        new BatchLocationQueries.GetBatchInLocationQuery({
          batchId: item.batch,
          locationType: returnDoc.locationType,
          locationId: locationId!,
        }),
      );

      if (batchLocation && batchLocation.quantity >= item.quantity) {
        await this.batchLocationPort.changeQuantity(
          new BatchLocationCommands.ChangeQuantityCommand(batchLocation._id, {
            quantityDelta: -item.quantity,
            reason: QuantityChangeReason.WRITE_OFF,
            referenceId: returnDoc._id,
            referenceType: 'SupplierReturn',
            comment: 'Returned to supplier',
          }),
        );
      }
    }

    returnDoc.status = ReturnStatus.COMPLETED;
    returnDoc.completedAt = now;
    returnDoc.totalLoss = 0; // Потери возмещаются поставщиком

    return returnDoc.save();
  }

  async cancel(command: Commands.CancelReturnCommand): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    if (returnDoc.status === ReturnStatus.COMPLETED) {
      throw new Error('Cannot cancel COMPLETED returns');
    }

    returnDoc.status = ReturnStatus.CANCELLED;
    if (command.data?.reason) {
      returnDoc.comment = `${returnDoc.comment || ''}\nОтмена: ${command.data.reason}`.trim();
    }

    return returnDoc.save();
  }

  async addPhotos(command: Commands.AddReturnPhotosCommand): Promise<Return> {
    const returnDoc = await this.returnModel.findById(command.returnId);
    if (!returnDoc) {
      throw new Error(`Return ${command.returnId} not found`);
    }

    returnDoc.photos = [...(returnDoc.photos || []), ...command.photos];
    return returnDoc.save();
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(query: Queries.GetReturnByIdQuery): Promise<Return | null> {
    return this.returnModel.findById(query.returnId);
  }

  async getByDocumentNumber(
    query: Queries.GetReturnByDocumentNumberQuery,
  ): Promise<Return | null> {
    return this.returnModel.findOne({
      seller: new Types.ObjectId(query.sellerId.toString()),
      documentNumber: query.documentNumber,
    });
  }

  async getByOrder(query: Queries.GetReturnByOrderQuery): Promise<Return[]> {
    return this.returnModel.find({
      order: new Types.ObjectId(query.orderId.toString()),
    });
  }

  async getBySeller(
    query: Queries.GetReturnsBySellerQuery,
  ): Promise<{ items: Return[]; total: number }> {
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
      this.returnModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.returnModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetReturnsForLocationQuery,
  ): Promise<{ items: Return[]; total: number }> {
    const field =
      query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';

    const filter: any = {
      locationType: query.data.locationType,
      [field]: new Types.ObjectId(query.data.locationId.toString()),
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

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.returnModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.returnModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getPendingInspection(
    query: Queries.GetPendingInspectionReturnsQuery,
  ): Promise<Return[]> {
    const filter: any = {
      status: ReturnStatus.PENDING_INSPECTION,
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

    return this.returnModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(query.data.limit || 50);
  }

  async getStatistics(
    query: Queries.GetReturnStatisticsQuery,
  ): Promise<ReturnStatistics> {
    const match: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
      status: ReturnStatus.COMPLETED,
    };

    if (query.data.type) {
      match.type = query.data.type;
    }

    if (query.data.locationType) {
      match.locationType = query.data.locationType;
    }

    if (query.data.locationId) {
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      match[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      match.completedAt = {};
      if (query.data.fromDate) match.completedAt.$gte = query.data.fromDate;
      if (query.data.toDate) match.completedAt.$lte = query.data.toDate;
    }

    const [totals, byType, byDecision] = await Promise.all([
      this.returnModel.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalReturns: { $addToSet: '$_id' },
            totalQuantity: { $sum: '$items.quantity' },
            totalValue: { $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] } },
          },
        },
        {
          $project: {
            totalReturns: { $size: '$totalReturns' },
            totalQuantity: 1,
            totalValue: 1,
          },
        },
      ]),
      this.returnModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            value: { $sum: '$totalValue' },
            loss: { $sum: '$totalLoss' },
          },
        },
      ]),
      this.returnModel.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.decision',
            count: { $sum: 1 },
            quantity: { $sum: '$items.quantity' },
            value: { $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] } },
          },
        },
      ]),
    ]);

    const total = totals[0] || {
      totalReturns: 0,
      totalQuantity: 0,
      totalValue: 0,
    };

    const totalLoss = await this.returnModel.aggregate([
      { $match: match },
      { $group: { _id: null, sum: { $sum: '$totalLoss' } } },
    ]);

    return {
      totalReturns: total.totalReturns,
      totalQuantity: total.totalQuantity,
      totalValue: total.totalValue || 0,
      totalLoss: totalLoss[0]?.sum || 0,
      byType: byType.map((t) => ({
        type: t._id as ReturnType,
        count: t.count,
        value: t.value || 0,
        loss: t.loss || 0,
      })),
      byDecision: byDecision.map((d) => ({
        decision: d._id as ReturnItemDecision,
        count: d.count,
        quantity: d.quantity,
        value: d.value || 0,
      })),
    };
  }

  async search(
    query: Queries.SearchReturnsQuery,
  ): Promise<{ items: Return[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { documentNumber: { $regex: query.data.search, $options: 'i' } },
        { comment: { $regex: query.data.search, $options: 'i' } },
        { supplier: { $regex: query.data.search, $options: 'i' } },
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
      this.returnModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.returnModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async generateDocumentNumber(
    sellerId: string,
    type: ReturnType,
  ): Promise<string> {
    const today = new Date();
    const typePrefix = {
      [ReturnType.CUSTOMER_RETURN]: 'RTC',
      [ReturnType.DELIVERY_RETURN]: 'RTD',
      [ReturnType.SUPPLIER_RETURN]: 'RTS',
    }[type];

    const prefix = `${typePrefix}-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;

    const lastReturn = await this.returnModel
      .findOne({
        seller: new Types.ObjectId(sellerId),
        documentNumber: { $regex: `^${prefix}` },
      })
      .sort({ documentNumber: -1 });

    let sequence = 1;
    if (lastReturn) {
      const lastNum = parseInt(
        lastReturn.documentNumber.split('-').pop() || '0',
        10,
      );
      sequence = lastNum + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }
}
