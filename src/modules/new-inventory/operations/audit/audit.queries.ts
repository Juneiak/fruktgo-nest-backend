import { Types } from 'mongoose';
import { AuditType, AuditStatus } from './audit.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Получить инвентаризацию по ID
 */
export class GetAuditByIdQuery {
  constructor(public readonly auditId: Types.ObjectId | string) {}
}

/**
 * Получить по номеру документа
 */
export class GetAuditByDocumentNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly documentNumber: string,
  ) {}
}

/**
 * Получить инвентаризации продавца
 */
export class GetAuditsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      type?: AuditType | AuditType[];
      status?: AuditStatus | AuditStatus[];
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'startedAt' | 'completedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить для локации
 */
export class GetAuditsForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      status?: AuditStatus | AuditStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить активные инвентаризации (IN_PROGRESS)
 */
export class GetActiveAuditsQuery {
  constructor(
    public readonly data?: {
      sellerId?: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить статистику инвентаризаций
 */
export class GetAuditStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {}
}

/**
 * Получить историю инвентаризаций для продукта
 */
export class GetProductAuditHistoryQuery {
  constructor(
    public readonly data: {
      productId: Types.ObjectId | string;
      sellerId?: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      limit?: number;
    },
  ) {}
}

/**
 * Поиск
 */
export class SearchAuditsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      type?: AuditType | AuditType[];
      status?: AuditStatus | AuditStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}
