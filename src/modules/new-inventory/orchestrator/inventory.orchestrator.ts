import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BATCH_PORT, BatchPort } from '../batch';
import { BATCH_LOCATION_PORT, BatchLocationPort, BatchLocationQueries, BatchLocationCommands } from '../batch-location';
import { RECEIVING_PORT, ReceivingPort } from '../operations/receiving';
import { TRANSFER_PORT, TransferPort } from '../operations/transfer';
import { WRITE_OFF_PORT, WriteOffPort } from '../operations/write-off';
import { RETURN_PORT, ReturnPort } from '../operations/return';
import { AUDIT_PORT, AuditPort, AuditCommands, Audit } from '../operations/audit';
import { MOVEMENT_PORT, MovementPort } from '../movement';
import { RESERVATION_PORT, ReservationPort, ReservationCommands, ReservationQueries, Reservation } from '../reservation';
import { EXPIRATION_ALERT_SERVICE, ExpirationAlertService } from '../alerts';
import { ShelfLifeCalculatorService } from '../core/shelf-life-calculator';

import * as T from './inventory.orchestrator.types';
import { LocationType, QuantityChangeReason } from '../batch-location/batch-location.enums';
import { ReservationCancelReason } from '../reservation/reservation.enums';

/**
 * Inventory Orchestrator
 *
 * Координирует все операции складского учёта.
 * Использует транзакции MongoDB и эмитит события.
 */
@Injectable()
export class InventoryOrchestrator {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(BATCH_LOCATION_PORT) private readonly batchLocationPort: BatchLocationPort,
    @Inject(RECEIVING_PORT) private readonly receivingPort: ReceivingPort,
    @Inject(TRANSFER_PORT) private readonly transferPort: TransferPort,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
    @Inject(RETURN_PORT) private readonly returnPort: ReturnPort,
    @Inject(AUDIT_PORT) private readonly auditPort: AuditPort,
    @Inject(MOVEMENT_PORT) private readonly movementPort: MovementPort,
    @Inject(RESERVATION_PORT) private readonly reservationPort: ReservationPort,
    @Inject(EXPIRATION_ALERT_SERVICE) private readonly expirationAlerts: ExpirationAlertService,
    private readonly shelfLifeCalculator: ShelfLifeCalculatorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // ИНВЕНТАРИЗАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  async createAudit(input: T.CreateAuditInput): Promise<Audit> {
    const audit = await this.auditPort.create(
      new AuditCommands.CreateAuditCommand({
        seller: input.seller,
        type: input.type,
        locationType: input.locationType,
        locationId: input.locationId,
        locationName: input.locationName,
        filterProducts: input.filterProducts,
        filterCategories: input.filterCategories,
        filterExpiringWithinDays: input.filterExpiringWithinDays,
        comment: input.comment,
        createdBy: input.createdBy,
      }),
    );

    this.eventEmitter.emit('inventory.audit.created', {
      auditId: audit._id.toHexString(),
      sellerId: audit.seller.toHexString(),
    });

    return audit;
  }

  async startAudit(input: T.StartAuditInput): Promise<Audit> {
    return this.auditPort.start(
      new AuditCommands.StartAuditCommand(input.auditId, {
        startedBy: input.startedBy,
      }),
    );
  }

  async updateAuditItems(input: T.UpdateAuditItemsInput): Promise<Audit> {
    return this.auditPort.bulkCountItems(
      new AuditCommands.BulkCountAuditItemsCommand(
        input.auditId,
        input.items,
        input.countedBy,
      ),
    );
  }

  async completeAudit(input: T.CompleteAuditInput): Promise<Audit> {
    const audit = await this.auditPort.complete(
      new AuditCommands.CompleteAuditCommand(input.auditId, {
        completedBy: input.completedBy,
        applyCorrections: input.applyCorrections,
      }),
    );

    this.eventEmitter.emit('inventory.audit.completed', {
      auditId: audit._id.toHexString(),
      sellerId: audit.seller.toHexString(),
      discrepancyItems: audit.discrepancyItems,
    });

    return audit;
  }

  // ═══════════════════════════════════════════════════════════════
  // РЕЗЕРВИРОВАНИЕ
  // ═══════════════════════════════════════════════════════════════

  async reserveForOrder(input: T.ReserveForOrderInput): Promise<{
    reservation: Reservation;
    shortages: Array<{
      productId: string;
      requestedQuantity: number;
      reservedQuantity: number;
      shortageQuantity: number;
    }>;
  }> {
    const result = await this.reservationPort.reserveByFefo(
      new ReservationCommands.ReserveByFefoCommand({
        seller: input.seller,
        order: input.order,
        customer: input.customer,
        shop: input.shop,
        shopName: input.shopName,
        products: input.products,
        ttlMinutes: input.ttlMinutes || 60,
      }),
    );

    this.eventEmitter.emit('inventory.reservation.created', {
      reservationId: result.reservation._id.toHexString(),
      orderId: input.order.toString(),
      hasShortages: result.shortages.length > 0,
    });

    return result;
  }

  async releaseReservation(input: T.ReleaseReservationInput): Promise<void> {
    const reservation = await this.reservationPort.cancelByOrder(
      new ReservationCommands.CancelReservationByOrderCommand(input.orderId, {
        reason: this.mapCancelReason(input.reason),
      }),
    );

    if (reservation) {
      this.eventEmitter.emit('inventory.reservation.released', {
        reservationId: reservation._id.toHexString(),
        orderId: input.orderId.toString(),
        reason: input.reason,
      });
    }
  }

  async consumeReservation(input: T.ConsumeReservationInput): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const reservation = await this.reservationPort.getByOrder(
        new ReservationQueries.GetReservationByOrderQuery(input.orderId),
      );

      if (!reservation) {
        throw new Error(`Reservation for order ${input.orderId} not found`);
      }

      await this.reservationPort.confirm(
        new ReservationCommands.ConfirmReservationCommand(reservation._id, {
          confirmedQuantities: input.actualQuantities?.map((aq) => {
            const itemIndex = reservation.items.findIndex(
              (item) => item.product.toHexString() === aq.productId.toString(),
            );
            return { itemIndex, quantity: aq.quantity };
          }),
        }),
      );

      await session.commitTransaction();

      this.eventEmitter.emit('inventory.reservation.consumed', {
        reservationId: reservation._id.toHexString(),
        orderId: input.orderId.toString(),
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ОФЛАЙН ПРОДАЖА
  // ═══════════════════════════════════════════════════════════════

  async checkOfflineSaleConflict(
    input: T.CheckOfflineSaleConflictInput,
  ): Promise<T.OfflineSaleConflictResult> {
    const conflicts: T.OfflineSaleConflictResult['conflicts'] = [];

    for (const product of input.products) {
      const stock = await this.batchLocationPort.getAggregatedStock(
        new BatchLocationQueries.GetAggregatedStockQuery({
          locationType: LocationType.SHOP,
          locationId: input.shop,
          productId: product.product,
        }),
      );

      const productStock = stock[0];
      if (!productStock) {
        conflicts.push({
          productId: product.product.toString(),
          requestedQuantity: product.quantity,
          availableQuantity: 0,
          reservedQuantity: 0,
          affectedOrders: [],
        });
        continue;
      }

      const available = productStock.availableQuantity;
      if (available < product.quantity) {
        const reservations = await this.reservationPort.getByShop(
          new ReservationQueries.GetReservationsByShopQuery({
            shopId: input.shop,
            status: 'ACTIVE' as any,
          }),
        );

        const affectedOrders = reservations.items
          .filter((r) =>
            r.items.some(
              (item) => item.product.toHexString() === product.product.toString(),
            ),
          )
          .map((r) => r.order.toHexString());

        conflicts.push({
          productId: product.product.toString(),
          requestedQuantity: product.quantity,
          availableQuantity: available,
          reservedQuantity: productStock.totalReserved,
          affectedOrders,
        });
      }
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  async processOfflineSale(input: T.ProcessOfflineSaleInput): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      for (const product of input.products) {
        if (input.overrideReservations) {
          await this.batchLocationPort.forceReleaseReservation(
            new BatchLocationCommands.ForceReleaseReservationCommand({
              seller: input.seller,
              product: product.product,
              locationType: LocationType.SHOP,
              locationId: input.shop,
              quantity: product.quantity,
              reason: 'Offline sale priority',
            }),
          );
        }

        await this.batchLocationPort.consumeByFefo(
          new BatchLocationCommands.ConsumeByFefoCommand({
            seller: input.seller,
            product: product.product,
            locationType: LocationType.SHOP,
            locationId: input.shop,
            quantity: product.quantity,
            reason: QuantityChangeReason.SALE,
            changedBy: input.processedBy,
            useAvailableOnly: !input.overrideReservations,
          }),
        );
      }

      await session.commitTransaction();

      this.eventEmitter.emit('inventory.offline_sale.processed', {
        shopId: input.shop.toString(),
        products: input.products.map((p) => ({
          productId: p.product.toString(),
          quantity: p.quantity,
        })),
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ОСТАТКИ
  // ═══════════════════════════════════════════════════════════════

  async getLocationStock(input: T.GetLocationStockInput): Promise<T.LocationStockResult> {
    const aggregated = await this.batchLocationPort.getAggregatedStock(
      new BatchLocationQueries.GetAggregatedStockQuery({
        locationType: input.locationType,
        locationId: input.locationId,
        productId: input.productId,
      }),
    );

    const products: T.LocationStockResult['products'] = [];
    let totalValue = 0;

    for (const agg of aggregated) {
      products.push({
        productId: agg.productId,
        totalQuantity: agg.totalQuantity,
        reservedQuantity: agg.totalReserved,
        availableQuantity: agg.availableQuantity,
        batches: [],
      });

      if (agg.averagePurchasePrice) {
        totalValue += agg.totalQuantity * agg.averagePurchasePrice;
      }
    }

    return {
      locationType: input.locationType,
      locationId: input.locationId.toString(),
      products,
      totalValue,
    };
  }

  async getProductStock(input: T.GetProductStockInput): Promise<T.ProductStockResult> {
    // TODO: реализовать агрегацию по всем локациям
    return {
      productId: input.product.toString(),
      totalQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      byLocation: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // АЛЕРТЫ
  // ═══════════════════════════════════════════════════════════════

  async getExpirationAlerts(sellerId: string) {
    return this.expirationAlerts.getBatchesByAlertLevel({ sellerId });
  }

  async generateExpirationReport(sellerId: string) {
    return this.expirationAlerts.generateDailyReport(sellerId);
  }

  async blockExpiredBatches(sellerId?: string) {
    return this.expirationAlerts.blockExpiredBatches(sellerId);
  }

  async autoWriteOffExpired(sellerId: string, daysAfterExpiration?: number) {
    return this.expirationAlerts.autoWriteOffExpired(sellerId, daysAfterExpiration);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapCancelReason(reason?: string): ReservationCancelReason {
    switch (reason) {
      case 'ORDER_CANCELLED':
      case 'ORDER_DECLINED':
        return ReservationCancelReason.ORDER_CANCELLED;
      case 'EXPIRED':
        return ReservationCancelReason.EXPIRED;
      default:
        return ReservationCancelReason.MANUAL;
    }
  }
}

export const INVENTORY_ORCHESTRATOR = Symbol('INVENTORY_ORCHESTRATOR');
