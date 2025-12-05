import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Reservation, ReservationModel } from './reservation.schema';
import {
  ReservationPort,
  ReserveByFefoResult,
  ReservationStatistics,
} from './reservation.port';
import {
  ReservationStatus,
  ReservationCancelReason,
  ReservationType,
} from './reservation.enums';
import { LocationType } from '../batch-location/batch-location.enums';
import * as Commands from './reservation.commands';
import * as Queries from './reservation.queries';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationCommands,
  BatchLocationQueries,
} from '../batch-location';

@Injectable()
export class ReservationService implements ReservationPort {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: ReservationModel,
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async create(
    command: Commands.CreateReservationCommand,
  ): Promise<Reservation> {
    const { data } = command;

    const ttlMinutes = data.ttlMinutes || 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const reservation = new this.reservationModel({
      seller: new Types.ObjectId(data.seller.toString()),
      order: new Types.ObjectId(data.order.toString()),
      customer: data.customer
        ? new Types.ObjectId(data.customer.toString())
        : undefined,
      shop: new Types.ObjectId(data.shop.toString()),
      shopName: data.shopName,
      type: data.type || ReservationType.ORDER,
      status: ReservationStatus.ACTIVE,
      expiresAt,
      items: data.items.map((item) => ({
        batch: new Types.ObjectId(item.batch.toString()),
        batchLocation: new Types.ObjectId(item.batchLocation.toString()),
        product: new Types.ObjectId(item.product.toString()),
        quantity: item.quantity,
        status: ReservationStatus.ACTIVE,
        batchExpirationDate: item.batchExpirationDate,
        batchFreshnessRemaining: item.batchFreshnessRemaining,
      })),
      comment: data.comment,
    });

    // Обновляем reservedQuantity в BatchLocation для каждой позиции
    for (const item of data.items) {
      await this.batchLocationPort.reserve(
        new BatchLocationCommands.ReserveQuantityCommand(
          item.batchLocation,
          item.quantity,
        ),
      );
    }

    return reservation.save();
  }

  async addItem(
    command: Commands.AddReservationItemCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error('Can only modify ACTIVE reservations');
    }

    reservation.items.push({
      batch: new Types.ObjectId(command.item.batch.toString()),
      batchLocation: new Types.ObjectId(command.item.batchLocation.toString()),
      product: new Types.ObjectId(command.item.product.toString()),
      quantity: command.item.quantity,
      status: ReservationStatus.ACTIVE,
      batchExpirationDate: command.item.batchExpirationDate,
      batchFreshnessRemaining: command.item.batchFreshnessRemaining,
    });

    // Резервируем в BatchLocation
    await this.batchLocationPort.reserve(
      new BatchLocationCommands.ReserveQuantityCommand(
        command.item.batchLocation,
        command.item.quantity,
      ),
    );

    return reservation.save();
  }

  async updateItemQuantity(
    command: Commands.UpdateReservationItemQuantityCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error('Can only modify ACTIVE reservations');
    }

    if (
      command.itemIndex < 0 ||
      command.itemIndex >= reservation.items.length
    ) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = reservation.items[command.itemIndex];
    const diff = command.newQuantity - item.quantity;

    if (diff > 0) {
      // Увеличиваем резерв
      await this.batchLocationPort.reserve(
        new BatchLocationCommands.ReserveQuantityCommand(
          item.batchLocation,
          diff,
        ),
      );
    } else if (diff < 0) {
      // Уменьшаем резерв
      await this.batchLocationPort.releaseReserve(
        new BatchLocationCommands.ReleaseReserveCommand(
          item.batchLocation,
          Math.abs(diff),
        ),
      );
    }

    item.quantity = command.newQuantity;
    return reservation.save();
  }

  async removeItem(
    command: Commands.RemoveReservationItemCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error('Can only modify ACTIVE reservations');
    }

    if (
      command.itemIndex < 0 ||
      command.itemIndex >= reservation.items.length
    ) {
      throw new Error(`Invalid item index ${command.itemIndex}`);
    }

    const item = reservation.items[command.itemIndex];

    // Снимаем резерв
    await this.batchLocationPort.releaseReserve(
      new BatchLocationCommands.ReleaseReserveCommand(
        item.batchLocation,
        item.quantity,
      ),
    );

    reservation.items.splice(command.itemIndex, 1);
    return reservation.save();
  }

  async confirm(
    command: Commands.ConfirmReservationCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (
      reservation.status !== ReservationStatus.ACTIVE &&
      reservation.status !== ReservationStatus.PARTIALLY_CONFIRMED
    ) {
      throw new Error('Can only confirm ACTIVE or PARTIALLY_CONFIRMED reservations');
    }

    const now = new Date();

    // Подтверждаем каждую позицию
    for (let i = 0; i < reservation.items.length; i++) {
      const item = reservation.items[i];
      if (item.status !== ReservationStatus.ACTIVE) continue;

      const confirmedQty =
        command.data?.confirmedQuantities?.find((c) => c.itemIndex === i)
          ?.quantity ?? item.quantity;

      item.confirmedQuantity = confirmedQty;
      item.status = ReservationStatus.CONFIRMED;

      // Подтверждаем резерв в BatchLocation (списываем)
      await this.batchLocationPort.confirmReserve(
        new BatchLocationCommands.ConfirmReserveCommand(
          item.batchLocation,
          confirmedQty,
        ),
      );

      // Если подтвердили меньше — снимаем остаток резерва
      if (confirmedQty < item.quantity) {
        await this.batchLocationPort.releaseReserve(
          new BatchLocationCommands.ReleaseReserveCommand(
            item.batchLocation,
            item.quantity - confirmedQty,
          ),
        );
      }
    }

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = now;

    return reservation.save();
  }

  async partiallyConfirm(
    command: Commands.PartiallyConfirmReservationCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error('Can only confirm ACTIVE reservations');
    }

    // Подтверждаем указанные позиции
    for (const confirmed of command.data.confirmedItems) {
      if (
        confirmed.itemIndex < 0 ||
        confirmed.itemIndex >= reservation.items.length
      ) {
        continue;
      }

      const item = reservation.items[confirmed.itemIndex];
      if (item.status !== ReservationStatus.ACTIVE) continue;

      item.confirmedQuantity = confirmed.quantity;
      item.status = ReservationStatus.CONFIRMED;

      await this.batchLocationPort.confirmReserve(
        new BatchLocationCommands.ConfirmReserveCommand(
          item.batchLocation,
          confirmed.quantity,
        ),
      );

      if (confirmed.quantity < item.quantity) {
        await this.batchLocationPort.releaseReserve(
          new BatchLocationCommands.ReleaseReserveCommand(
            item.batchLocation,
            item.quantity - confirmed.quantity,
          ),
        );
      }
    }

    // Проверяем, все ли позиции подтверждены
    const allConfirmed = reservation.items.every(
      (item) => item.status === ReservationStatus.CONFIRMED,
    );

    reservation.status = allConfirmed
      ? ReservationStatus.CONFIRMED
      : ReservationStatus.PARTIALLY_CONFIRMED;

    if (allConfirmed) {
      reservation.confirmedAt = new Date();
    }

    return reservation.save();
  }

  async cancel(
    command: Commands.CancelReservationCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (
      reservation.status !== ReservationStatus.ACTIVE &&
      reservation.status !== ReservationStatus.PARTIALLY_CONFIRMED
    ) {
      throw new Error('Can only cancel ACTIVE or PARTIALLY_CONFIRMED reservations');
    }

    // Снимаем резервы с активных позиций
    for (const item of reservation.items) {
      if (item.status === ReservationStatus.ACTIVE) {
        await this.batchLocationPort.releaseReserve(
          new BatchLocationCommands.ReleaseReserveCommand(
            item.batchLocation,
            item.quantity,
          ),
        );
        item.status = ReservationStatus.CANCELLED;
      }
    }

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancelReason =
      command.data?.reason || ReservationCancelReason.MANUAL;
    reservation.cancelComment = command.data?.comment;

    return reservation.save();
  }

  async cancelByOrder(
    command: Commands.CancelReservationByOrderCommand,
  ): Promise<Reservation | null> {
    const reservation = await this.reservationModel.findOne({
      order: new Types.ObjectId(command.orderId.toString()),
    });

    if (!reservation) {
      return null;
    }

    if (
      reservation.status !== ReservationStatus.ACTIVE &&
      reservation.status !== ReservationStatus.PARTIALLY_CONFIRMED
    ) {
      return reservation;
    }

    return this.cancel(
      new Commands.CancelReservationCommand(reservation._id, command.data),
    );
  }

  async extend(
    command: Commands.ExtendReservationCommand,
  ): Promise<Reservation> {
    const reservation = await this.reservationModel.findById(
      command.reservationId,
    );
    if (!reservation) {
      throw new Error(`Reservation ${command.reservationId} not found`);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new Error('Can only extend ACTIVE reservations');
    }

    reservation.expiresAt = new Date(
      reservation.expiresAt.getTime() + command.additionalMinutes * 60 * 1000,
    );

    return reservation.save();
  }

  async markExpired(
    command: Commands.MarkExpiredReservationsCommand,
  ): Promise<number> {
    const now = new Date();

    const expiredReservations = await this.reservationModel.find({
      status: ReservationStatus.ACTIVE,
      expiresAt: { $lt: now },
    });

    let count = 0;

    for (const reservation of expiredReservations) {
      // Снимаем резервы
      for (const item of reservation.items) {
        if (item.status === ReservationStatus.ACTIVE) {
          await this.batchLocationPort.releaseReserve(
            new BatchLocationCommands.ReleaseReserveCommand(
              item.batchLocation,
              item.quantity,
            ),
          );
          item.status = ReservationStatus.EXPIRED;
        }
      }

      reservation.status = ReservationStatus.EXPIRED;
      reservation.cancelReason = ReservationCancelReason.EXPIRED;
      reservation.cancelledAt = now;
      await reservation.save();
      count++;
    }

    return count;
  }

  async reserveByFefo(
    command: Commands.ReserveByFefoCommand,
  ): Promise<ReserveByFefoResult> {
    const { data } = command;
    const items: Commands.ReservationItemInput[] = [];
    const shortages: ReserveByFefoResult['shortages'] = [];

    // Для каждого продукта находим партии по FEFO
    for (const productReq of data.products) {
      let remainingQty = productReq.quantity;

      // Получаем BatchLocations для продукта в магазине, отсортированные по сроку годности
      const batchLocations = await this.batchLocationPort.getProductStockInLocation(
        new BatchLocationQueries.GetProductStockInLocationQuery({
          seller: data.seller,
          product: productReq.product,
          locationType: LocationType.SHOP,
          locationId: data.shop,
          sortByExpiration: true,
          withQuantityOnly: true,
        }),
      );

      for (const bl of batchLocations) {
        if (remainingQty <= 0) break;

        const available = bl.quantity - bl.reservedQuantity;
        if (available <= 0) continue;

        const toReserve = Math.min(available, remainingQty);

        items.push({
          batch: bl.batch,
          batchLocation: bl._id,
          product: bl.product,
          quantity: toReserve,
          batchExpirationDate: bl.effectiveExpirationDate,
          batchFreshnessRemaining: bl.freshnessRemaining,
        });

        remainingQty -= toReserve;
      }

      if (remainingQty > 0) {
        shortages.push({
          productId: productReq.product.toString(),
          requestedQuantity: productReq.quantity,
          reservedQuantity: productReq.quantity - remainingQty,
          shortageQuantity: remainingQty,
        });
      }
    }

    // Создаём резерв
    const reservation = await this.create(
      new Commands.CreateReservationCommand({
        seller: data.seller,
        order: data.order,
        customer: data.customer,
        shop: data.shop,
        shopName: data.shopName,
        items,
        ttlMinutes: data.ttlMinutes,
        comment: data.comment,
      }),
    );

    return { reservation, shortages };
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getById(
    query: Queries.GetReservationByIdQuery,
  ): Promise<Reservation | null> {
    return this.reservationModel.findById(query.reservationId);
  }

  async getByOrder(
    query: Queries.GetReservationByOrderQuery,
  ): Promise<Reservation | null> {
    return this.reservationModel.findOne({
      order: new Types.ObjectId(query.orderId.toString()),
    });
  }

  async getByShop(
    query: Queries.GetReservationsByShopQuery,
  ): Promise<{ items: Reservation[]; total: number }> {
    const filter: any = {
      shop: new Types.ObjectId(query.data.shopId.toString()),
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

    const [items, total] = await Promise.all([
      this.reservationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.reservationModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getBySeller(
    query: Queries.GetReservationsBySellerQuery,
  ): Promise<{ items: Reservation[]; total: number }> {
    const filter: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.shopId) {
      filter.shop = new Types.ObjectId(query.data.shopId.toString());
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
      this.reservationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.data.offset || 0)
        .limit(query.data.limit || 50),
      this.reservationModel.countDocuments(filter),
    ]);

    return { items, total };
  }

  async getActiveForBatch(
    query: Queries.GetActiveReservationsForBatchQuery,
  ): Promise<Reservation[]> {
    const filter: any = {
      status: ReservationStatus.ACTIVE,
      'items.batch': new Types.ObjectId(query.data.batchId.toString()),
    };

    if (query.data.shopId) {
      filter.shop = new Types.ObjectId(query.data.shopId.toString());
    }

    return this.reservationModel.find(filter);
  }

  async getActiveForBatchLocation(
    query: Queries.GetActiveReservationsForBatchLocationQuery,
  ): Promise<Reservation[]> {
    return this.reservationModel.find({
      status: ReservationStatus.ACTIVE,
      'items.batchLocation': new Types.ObjectId(query.batchLocationId.toString()),
    });
  }

  async getExpired(
    query: Queries.GetExpiredReservationsQuery,
  ): Promise<Reservation[]> {
    const now = new Date();
    const filter: any = {
      status: ReservationStatus.ACTIVE,
      expiresAt: { $lt: now },
    };

    if (query.data?.sellerId) {
      filter.seller = new Types.ObjectId(query.data.sellerId.toString());
    }

    if (query.data?.shopId) {
      filter.shop = new Types.ObjectId(query.data.shopId.toString());
    }

    return this.reservationModel
      .find(filter)
      .limit(query.data?.limit || 100);
  }

  async getReservedQuantityForProduct(
    query: Queries.GetReservedQuantityForProductQuery,
  ): Promise<number> {
    const result = await this.reservationModel.aggregate([
      {
        $match: {
          shop: new Types.ObjectId(query.data.shopId.toString()),
          status: ReservationStatus.ACTIVE,
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.product': new Types.ObjectId(query.data.productId.toString()),
          'items.status': ReservationStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: null,
          totalReserved: { $sum: '$items.quantity' },
        },
      },
    ]);

    return result[0]?.totalReserved || 0;
  }

  async getReservedQuantityForBatchLocation(
    query: Queries.GetReservedQuantityForBatchLocationQuery,
  ): Promise<number> {
    const result = await this.reservationModel.aggregate([
      {
        $match: {
          status: ReservationStatus.ACTIVE,
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.batchLocation': new Types.ObjectId(
            query.batchLocationId.toString(),
          ),
          'items.status': ReservationStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: null,
          totalReserved: { $sum: '$items.quantity' },
        },
      },
    ]);

    return result[0]?.totalReserved || 0;
  }

  async getStatistics(
    query: Queries.GetReservationStatisticsQuery,
  ): Promise<ReservationStatistics> {
    const match: any = {
      seller: new Types.ObjectId(query.data.sellerId.toString()),
    };

    if (query.data.shopId) {
      match.shop = new Types.ObjectId(query.data.shopId.toString());
    }

    if (query.data.fromDate || query.data.toDate) {
      match.createdAt = {};
      if (query.data.fromDate) match.createdAt.$gte = query.data.fromDate;
      if (query.data.toDate) match.createdAt.$lte = query.data.toDate;
    }

    const [counts, byStatus] = await Promise.all([
      this.reservationModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.reservationModel.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
      ]),
    ]);

    const countMap = counts.reduce(
      (acc, c) => {
        acc[c._id] = c.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const activeReserved = await this.reservationModel.aggregate([
      { $match: { ...match, status: ReservationStatus.ACTIVE } },
      { $unwind: '$items' },
      { $match: { 'items.status': ReservationStatus.ACTIVE } },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } },
    ]);

    return {
      totalActive: countMap[ReservationStatus.ACTIVE] || 0,
      totalConfirmed: countMap[ReservationStatus.CONFIRMED] || 0,
      totalCancelled: countMap[ReservationStatus.CANCELLED] || 0,
      totalExpired: countMap[ReservationStatus.EXPIRED] || 0,
      totalReservedQuantity: activeReserved[0]?.total || 0,
      byStatus: byStatus.map((s) => ({
        status: s._id as ReservationStatus,
        count: s.count,
        totalQuantity: s.totalQuantity,
      })),
    };
  }
}
