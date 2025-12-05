import { Types } from 'mongoose';
import { LocationType, BatchLocationStatus } from './batch-location.enums';

/**
 * Получить по ID
 */
export class GetBatchLocationByIdQuery {
  constructor(public readonly batchLocationId: Types.ObjectId | string) {}
}

/**
 * Получить все остатки партии
 */
export class GetByBatchQuery {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}

/**
 * Получить остаток партии в конкретной локации
 */
export class GetBatchInLocationQuery {
  constructor(
    public readonly data: {
      batchId: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить остатки товара в локации (для FEFO)
 */
export class GetProductStockInLocationQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      status?: BatchLocationStatus | BatchLocationStatus[];
      /** Сортировать по сроку (FEFO) */
      sortByExpiration?: boolean;
      /** Только с положительным остатком */
      withQuantityOnly?: boolean;
    },
  ) {}
}

/**
 * Получить агрегированный остаток в локации
 */
export class GetAggregatedStockQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить все остатки в локации
 */
export class GetAllStockInLocationQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      status?: BatchLocationStatus | BatchLocationStatus[];
      /** Только с количеством > 0 */
      withQuantityOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить зарезервированное количество по заказу
 */
export class GetReservedByOrderQuery {
  constructor(public readonly orderId: Types.ObjectId | string) {}
}

/**
 * Проверить доступность количества
 */
export class CheckAvailabilityQuery {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
    },
  ) {}
}

/**
 * Получить товары с низким остатком
 */
export class GetLowStockQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      /** Порог для "низкого остатка" */
      threshold: number;
    },
  ) {}
}

/**
 * Получить статистику по локации
 */
export class GetLocationStockStatisticsQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
    },
  ) {}
}
