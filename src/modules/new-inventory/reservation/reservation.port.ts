import { Reservation } from './reservation.schema';
import * as Commands from './reservation.commands';
import * as Queries from './reservation.queries';
import { ReservationStatus } from './reservation.enums';

/**
 * Результат резервирования по FEFO
 */
export interface ReserveByFefoResult {
  reservation: Reservation;
  /** Товары, которые не удалось зарезервировать полностью */
  shortages: Array<{
    productId: string;
    requestedQuantity: number;
    reservedQuantity: number;
    shortageQuantity: number;
  }>;
}

/**
 * Статистика резервов
 */
export interface ReservationStatistics {
  totalActive: number;
  totalConfirmed: number;
  totalCancelled: number;
  totalExpired: number;
  totalReservedQuantity: number;
  byStatus: Array<{
    status: ReservationStatus;
    count: number;
    totalQuantity: number;
  }>;
}

/**
 * Порт модуля Reservation
 */
export interface ReservationPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать резерв */
  create(command: Commands.CreateReservationCommand): Promise<Reservation>;

  /** Добавить позицию */
  addItem(command: Commands.AddReservationItemCommand): Promise<Reservation>;

  /** Обновить количество */
  updateItemQuantity(
    command: Commands.UpdateReservationItemQuantityCommand,
  ): Promise<Reservation>;

  /** Удалить позицию */
  removeItem(command: Commands.RemoveReservationItemCommand): Promise<Reservation>;

  /** Подтвердить резерв */
  confirm(command: Commands.ConfirmReservationCommand): Promise<Reservation>;

  /** Частично подтвердить */
  partiallyConfirm(
    command: Commands.PartiallyConfirmReservationCommand,
  ): Promise<Reservation>;

  /** Отменить резерв */
  cancel(command: Commands.CancelReservationCommand): Promise<Reservation>;

  /** Отменить по заказу */
  cancelByOrder(
    command: Commands.CancelReservationByOrderCommand,
  ): Promise<Reservation | null>;

  /** Продлить резерв */
  extend(command: Commands.ExtendReservationCommand): Promise<Reservation>;

  /** Пометить истёкшие */
  markExpired(
    command: Commands.MarkExpiredReservationsCommand,
  ): Promise<number>;

  /** Зарезервировать по FEFO */
  reserveByFefo(
    command: Commands.ReserveByFefoCommand,
  ): Promise<ReserveByFefoResult>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetReservationByIdQuery): Promise<Reservation | null>;

  /** Получить по заказу */
  getByOrder(
    query: Queries.GetReservationByOrderQuery,
  ): Promise<Reservation | null>;

  /** Получить по магазину */
  getByShop(
    query: Queries.GetReservationsByShopQuery,
  ): Promise<{ items: Reservation[]; total: number }>;

  /** Получить по продавцу */
  getBySeller(
    query: Queries.GetReservationsBySellerQuery,
  ): Promise<{ items: Reservation[]; total: number }>;

  /** Получить активные для партии */
  getActiveForBatch(
    query: Queries.GetActiveReservationsForBatchQuery,
  ): Promise<Reservation[]>;

  /** Получить активные для BatchLocation */
  getActiveForBatchLocation(
    query: Queries.GetActiveReservationsForBatchLocationQuery,
  ): Promise<Reservation[]>;

  /** Получить истёкшие */
  getExpired(query: Queries.GetExpiredReservationsQuery): Promise<Reservation[]>;

  /** Получить зарезервированное количество для продукта */
  getReservedQuantityForProduct(
    query: Queries.GetReservedQuantityForProductQuery,
  ): Promise<number>;

  /** Получить зарезервированное количество для BatchLocation */
  getReservedQuantityForBatchLocation(
    query: Queries.GetReservedQuantityForBatchLocationQuery,
  ): Promise<number>;

  /** Получить статистику */
  getStatistics(
    query: Queries.GetReservationStatisticsQuery,
  ): Promise<ReservationStatistics>;
}

export const RESERVATION_PORT = Symbol('RESERVATION_PORT');
