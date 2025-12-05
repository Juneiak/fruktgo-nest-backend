import { Types } from 'mongoose';
import { ReservationType, ReservationCancelReason } from './reservation.enums';

/**
 * Позиция для резервирования
 */
export interface ReservationItemInput {
  batch: Types.ObjectId | string;
  batchLocation: Types.ObjectId | string;
  product: Types.ObjectId | string;
  quantity: number;
  batchExpirationDate?: Date;
  batchFreshnessRemaining?: number;
}

/**
 * Создать резервирование
 */
export class CreateReservationCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      order: Types.ObjectId | string;
      customer?: Types.ObjectId | string;
      shop: Types.ObjectId | string;
      shopName?: string;
      type?: ReservationType;
      items: ReservationItemInput[];
      /** Время жизни в минутах (по умолчанию 60) */
      ttlMinutes?: number;
      comment?: string;
    },
  ) {}
}

/**
 * Добавить позицию в резерв
 */
export class AddReservationItemCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly item: ReservationItemInput,
  ) {}
}

/**
 * Обновить количество позиции
 */
export class UpdateReservationItemQuantityCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly newQuantity: number,
  ) {}
}

/**
 * Удалить позицию из резерва
 */
export class RemoveReservationItemCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly itemIndex: number,
  ) {}
}

/**
 * Подтвердить резерв (при сборке заказа)
 */
export class ConfirmReservationCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly data?: {
      /** Фактические количества по позициям (если отличаются) */
      confirmedQuantities?: Array<{
        itemIndex: number;
        quantity: number;
      }>;
    },
  ) {}
}

/**
 * Частично подтвердить резерв
 */
export class PartiallyConfirmReservationCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly data: {
      /** Позиции для подтверждения */
      confirmedItems: Array<{
        itemIndex: number;
        quantity: number;
      }>;
    },
  ) {}
}

/**
 * Отменить резерв
 */
export class CancelReservationCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly data?: {
      reason?: ReservationCancelReason;
      comment?: string;
    },
  ) {}
}

/**
 * Отменить резерв по заказу
 */
export class CancelReservationByOrderCommand {
  constructor(
    public readonly orderId: Types.ObjectId | string,
    public readonly data?: {
      reason?: ReservationCancelReason;
      comment?: string;
    },
  ) {}
}

/**
 * Продлить время резерва
 */
export class ExtendReservationCommand {
  constructor(
    public readonly reservationId: Types.ObjectId | string,
    public readonly additionalMinutes: number,
  ) {}
}

/**
 * Пометить истёкшие резервы
 */
export class MarkExpiredReservationsCommand {
  constructor() {}
}

/**
 * Зарезервировать товар по FEFO (First Expired First Out)
 * Автоматически выбирает партии с ближайшим сроком годности
 */
export class ReserveByFefoCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      order: Types.ObjectId | string;
      customer?: Types.ObjectId | string;
      shop: Types.ObjectId | string;
      shopName?: string;
      /** Товары для резервирования */
      products: Array<{
        product: Types.ObjectId | string;
        quantity: number;
      }>;
      ttlMinutes?: number;
      comment?: string;
    },
  ) {}
}
