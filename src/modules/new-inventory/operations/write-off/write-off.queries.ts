import { Types } from 'mongoose';
import { WriteOffStatus } from './write-off.enums';
import { WriteOffReason } from '../../batch/batch.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Получить списание по ID
 */
export class GetWriteOffByIdQuery {
  constructor(public readonly writeOffId: Types.ObjectId | string) {}
}

/**
 * Получить списание по номеру документа
 */
export class GetWriteOffByDocumentNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly documentNumber: string,
  ) {}
}

/**
 * Получить списания продавца
 */
export class GetWriteOffsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: WriteOffStatus | WriteOffStatus[];
      reason?: WriteOffReason;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'confirmedAt' | 'totalLoss';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить списания для локации
 */
export class GetWriteOffsForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      status?: WriteOffStatus | WriteOffStatus[];
      reason?: WriteOffReason;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить статистику списаний
 */
export class GetWriteOffStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      groupBy?: 'reason' | 'product' | 'day' | 'month';
    },
  ) {}
}

/**
 * Поиск списаний
 */
export class SearchWriteOffsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      status?: WriteOffStatus | WriteOffStatus[];
      reason?: WriteOffReason;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}
