import { Types } from 'mongoose';
import { ReturnType, ReturnStatus, ReturnItemDecision } from './return.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Получить возврат по ID
 */
export class GetReturnByIdQuery {
  constructor(public readonly returnId: Types.ObjectId | string) {}
}

/**
 * Получить возврат по номеру документа
 */
export class GetReturnByDocumentNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly documentNumber: string,
  ) {}
}

/**
 * Получить возврат по заказу
 */
export class GetReturnByOrderQuery {
  constructor(public readonly orderId: Types.ObjectId | string) {}
}

/**
 * Получить возвраты продавца
 */
export class GetReturnsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      type?: ReturnType | ReturnType[];
      status?: ReturnStatus | ReturnStatus[];
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'completedAt' | 'totalValue';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить возвраты для локации
 */
export class GetReturnsForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      type?: ReturnType | ReturnType[];
      status?: ReturnStatus | ReturnStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить возвраты, ожидающие осмотра
 */
export class GetPendingInspectionReturnsQuery {
  constructor(
    public readonly data: {
      sellerId?: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      limit?: number;
    },
  ) {}
}

/**
 * Получить статистику возвратов
 */
export class GetReturnStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      type?: ReturnType;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      groupBy?: 'type' | 'reason' | 'decision' | 'day' | 'month';
    },
  ) {}
}

/**
 * Поиск возвратов
 */
export class SearchReturnsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      type?: ReturnType | ReturnType[];
      status?: ReturnStatus | ReturnStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}
