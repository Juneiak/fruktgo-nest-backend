import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Movement, MovementModel } from './movement.schema';
import { MovementPort, MovementsSummary } from './movement.port';
import { MovementType, MovementDocumentType } from './movement.enums';
import { LocationType } from '../batch-location/batch-location.enums';
import * as Commands from './movement.commands';
import * as Queries from './movement.queries';

@Injectable()
export class MovementService implements MovementPort {
  constructor(
    @InjectModel(Movement.name)
    private readonly movementModel: MovementModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async record(command: Commands.RecordMovementCommand): Promise<Movement> {
    const { data } = command;

    const movement = new this.movementModel({
      seller: new Types.ObjectId(data.seller.toString()),
      type: data.type,
      batch: new Types.ObjectId(data.batch.toString()),
      product: new Types.ObjectId(data.product.toString()),
      batchLocation: data.batchLocation
        ? new Types.ObjectId(data.batchLocation.toString())
        : undefined,
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
      quantityChange: data.quantityChange,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      reservedBefore: data.reservedBefore,
      reservedAfter: data.reservedAfter,
      document: data.document
        ? {
            type: data.document.type,
            id: new Types.ObjectId(data.document.id.toString()),
            documentNumber: data.document.documentNumber,
          }
        : undefined,
      actor: {
        type: data.actor.type,
        id: data.actor.id
          ? new Types.ObjectId(data.actor.id.toString())
          : undefined,
        name: data.actor.name,
      },
      comment: data.comment,
    });

    return movement.save();
  }

  async bulkRecord(
    command: Commands.BulkRecordMovementsCommand,
  ): Promise<Movement[]> {
    const docs = command.movements.map((data) => ({
      seller: new Types.ObjectId(data.seller.toString()),
      type: data.type,
      batch: new Types.ObjectId(data.batch.toString()),
      product: new Types.ObjectId(data.product.toString()),
      batchLocation: data.batchLocation
        ? new Types.ObjectId(data.batchLocation.toString())
        : undefined,
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
      quantityChange: data.quantityChange,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      reservedBefore: data.reservedBefore,
      reservedAfter: data.reservedAfter,
      document: data.document
        ? {
            type: data.document.type,
            id: new Types.ObjectId(data.document.id.toString()),
            documentNumber: data.document.documentNumber,
          }
        : undefined,
      actor: {
        type: data.actor.type,
        id: data.actor.id
          ? new Types.ObjectId(data.actor.id.toString())
          : undefined,
        name: data.actor.name,
      },
      comment: data.comment,
    }));

    return this.movementModel.insertMany(docs);
  }

  async recordReceiving(
    command: Commands.RecordReceivingMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: MovementType.RECEIVING,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        locationName: command.data.locationName,
        quantityChange: command.data.quantity,
        balanceBefore: 0,
        balanceAfter: command.data.balanceAfter,
        document: {
          type: MovementDocumentType.RECEIVING,
          id: command.data.receivingId,
          documentNumber: command.data.receivingDocumentNumber,
        },
        actor: command.data.actor,
      }),
    );
  }

  async recordTransferOut(
    command: Commands.RecordTransferOutMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: MovementType.TRANSFER_OUT,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: -command.data.quantity,
        balanceBefore: command.data.balanceBefore,
        balanceAfter: command.data.balanceAfter,
        document: {
          type: MovementDocumentType.TRANSFER,
          id: command.data.transferId,
          documentNumber: command.data.transferDocumentNumber,
        },
        actor: command.data.actor,
      }),
    );
  }

  async recordTransferIn(
    command: Commands.RecordTransferInMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: MovementType.TRANSFER_IN,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: command.data.quantity,
        balanceBefore: 0,
        balanceAfter: command.data.balanceAfter,
        document: {
          type: MovementDocumentType.TRANSFER,
          id: command.data.transferId,
          documentNumber: command.data.transferDocumentNumber,
        },
        actor: command.data.actor,
      }),
    );
  }

  async recordWriteOff(
    command: Commands.RecordWriteOffMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: MovementType.WRITE_OFF,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: -command.data.quantity,
        balanceBefore: command.data.balanceBefore,
        balanceAfter: command.data.balanceAfter,
        document: {
          type: MovementDocumentType.WRITE_OFF,
          id: command.data.writeOffId,
          documentNumber: command.data.writeOffDocumentNumber,
        },
        actor: command.data.actor,
      }),
    );
  }

  async recordSale(
    command: Commands.RecordSaleMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: command.data.isOffline
          ? MovementType.OFFLINE_SALE
          : MovementType.SALE,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: -command.data.quantity,
        balanceBefore: command.data.balanceBefore,
        balanceAfter: command.data.balanceAfter,
        reservedBefore: command.data.reservedBefore,
        reservedAfter: command.data.reservedAfter,
        document: {
          type: MovementDocumentType.ORDER,
          id: command.data.orderId,
        },
        actor: command.data.actor,
      }),
    );
  }

  async recordReservation(
    command: Commands.RecordReservationMovementCommand,
  ): Promise<Movement> {
    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type: MovementType.RESERVATION,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: 0, // Резервирование не меняет остаток
        balanceBefore: 0,
        balanceAfter: 0,
        reservedBefore: command.data.reservedBefore,
        reservedAfter: command.data.reservedAfter,
        document: {
          type: MovementDocumentType.RESERVATION,
          id: command.data.reservationId,
        },
        actor: command.data.actor,
        comment: `Order: ${command.data.orderId}`,
      }),
    );
  }

  async recordReservationRelease(
    command: Commands.RecordReservationReleaseMovementCommand,
  ): Promise<Movement> {
    const type =
      command.data.reason === 'confirmed'
        ? MovementType.RESERVATION_CONFIRM
        : MovementType.RESERVATION_RELEASE;

    return this.record(
      new Commands.RecordMovementCommand({
        seller: command.data.seller,
        type,
        batch: command.data.batch,
        product: command.data.product,
        batchLocation: command.data.batchLocation,
        locationType: command.data.locationType,
        locationId: command.data.locationId,
        quantityChange: 0,
        balanceBefore: 0,
        balanceAfter: 0,
        reservedBefore: command.data.reservedBefore,
        reservedAfter: command.data.reservedAfter,
        document: {
          type: MovementDocumentType.RESERVATION,
          id: command.data.reservationId,
        },
        actor: command.data.actor,
        comment: `Order: ${command.data.orderId}, Reason: ${command.data.reason}`,
      }),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetMovementByIdQuery,
  ): Promise<Movement | null> {
    return this.movementModel.findById(query.movementId);
  }

  async getByBatch(
    query: Queries.GetMovementsByBatchQuery,
  ): Promise<{ items: Movement[]; total: number }> {
    const filter: any = {
      batch: new Types.ObjectId(query.data.batchId.toString()),
    };

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.movementModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getByProduct(
    query: Queries.GetMovementsByProductQuery,
  ): Promise<{ items: Movement[]; total: number }> {
    const filter: any = {
      product: new Types.ObjectId(query.data.productId.toString()),
    };

    if (query.data.sellerId) {
      filter.seller = new Types.ObjectId(query.data.sellerId.toString());
    }

    if (query.data.locationType) {
      filter.locationType = query.data.locationType;
    }

    if (query.data.locationId) {
      const field =
        query.data.locationType === LocationType.SHOP ? 'shop' : 'warehouse';
      filter[field] = new Types.ObjectId(query.data.locationId.toString());
    }

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
    }

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.movementModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getForLocation(
    query: Queries.GetMovementsForLocationQuery,
  ): Promise<{ items: Movement[]; total: number }> {
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

    if (query.data.fromDate || query.data.toDate) {
      filter.createdAt = {};
      if (query.data.fromDate) filter.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) filter.createdAt.$lte = query.data.toDate;
    }

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.movementModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getByDocument(
    query: Queries.GetMovementsByDocumentQuery,
  ): Promise<Movement[]> {
    return this.movementModel
      .find({
        'document.type': query.data.documentType,
        'document.id': new Types.ObjectId(query.data.documentId.toString()),
      })
      .sort({ createdAt: 1 });
  }

  async getBySeller(
    query: Queries.GetMovementsBySellerQuery,
  ): Promise<{ items: Movement[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
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

    const sortOrder = query.data.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.movementModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getSummary(
    query: Queries.GetMovementsSummaryQuery,
  ): Promise<MovementsSummary> {
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

    if (query.data.productId) {
      match.product = new Types.ObjectId(query.data.productId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      match.createdAt = {};
      if (query.data.fromDate) match.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) match.createdAt.$lte = query.data.toDate;
    }

    const [totals, byType] = await Promise.all([
      this.movementModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0] },
            },
            totalExpense: {
              $sum: { $cond: [{ $lt: ['$quantityChange', 0] }, '$quantityChange', 0] },
            },
          },
        },
      ]),
      this.movementModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalQuantity: { $sum: { $abs: '$quantityChange' } },
          },
        },
      ]),
    ]);

    const total = totals[0] || { totalIncome: 0, totalExpense: 0 };

    return {
      totalIncome: total.totalIncome,
      totalExpense: Math.abs(total.totalExpense),
      netChange: total.totalIncome + total.totalExpense,
      byType: byType.map((t) => ({
        type: t._id as MovementType,
        count: t.count,
        totalQuantity: t.totalQuantity,
      })),
    };
  }

  async search(
    query: Queries.SearchMovementsQuery,
  ): Promise<{ items: Movement[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.search) {
      filter.$or = [
        { comment: { $regex: query.data.search, $options: 'i' } },
        { 'document.documentNumber': { $regex: query.data.search, $options: 'i' } },
      ];
    }

    if (query.data.type) {
      filter.type = Array.isArray(query.data.type)
        ? { $in: query.data.type }
        : query.data.type;
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

    const [items, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.movementModel.countDocuments(filter),
    ]);

    return { items, total };
  }
}
