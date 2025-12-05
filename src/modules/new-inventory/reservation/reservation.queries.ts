import { Types } from 'mongoose';
import { ReservationStatus, ReservationType } from './reservation.enums';

/**
 * Получить резерв по ID
 */
export class GetReservationByIdQuery {
  constructor(public readonly reservationId: Types.ObjectId | string) {}
}

/**
 * Получить резерв по заказу
 */
export class GetReservationByOrderQuery {
  constructor(public readonly orderId: Types.ObjectId | string) {}
}

/**
 * Получить резервы магазина
 */
export class GetReservationsByShopQuery {
  constructor(
    public readonly data: {
      shopId: Types.ObjectId | string;
      status?: ReservationStatus | ReservationStatus[];
      type?: ReservationType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить резервы продавца
 */
export class GetReservationsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      shopId?: Types.ObjectId | string;
      status?: ReservationStatus | ReservationStatus[];
      type?: ReservationType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить активные резервы для партии
 */
export class GetActiveReservationsForBatchQuery {
  constructor(
    public readonly data: {
      batchId: Types.ObjectId | string;
      shopId?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить активные резервы для BatchLocation
 */
export class GetActiveReservationsForBatchLocationQuery {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
  ) {}
}

/**
 * Получить истёкшие резервы
 */
export class GetExpiredReservationsQuery {
  constructor(
    public readonly data?: {
      sellerId?: Types.ObjectId | string;
      shopId?: Types.ObjectId | string;
      limit?: number;
    },
  ) {}
}

/**
 * Получить зарезервированное количество для продукта
 */
export class GetReservedQuantityForProductQuery {
  constructor(
    public readonly data: {
      productId: Types.ObjectId | string;
      shopId: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить зарезервированное количество для BatchLocation
 */
export class GetReservedQuantityForBatchLocationQuery {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
  ) {}
}

/**
 * Получить статистику резервов
 */
export class GetReservationStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      shopId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {}
}
