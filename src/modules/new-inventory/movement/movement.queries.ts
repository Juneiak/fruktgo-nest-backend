import { Types } from 'mongoose';
import { MovementType, MovementDocumentType } from './movement.enums';
import { LocationType } from '../batch-location/batch-location.enums';

/**
 * Получить движение по ID
 */
export class GetMovementByIdQuery {
  constructor(public readonly movementId: Types.ObjectId | string) {}
}

/**
 * Получить движения партии
 */
export class GetMovementsByBatchQuery {
  constructor(
    public readonly data: {
      batchId: Types.ObjectId | string;
      type?: MovementType | MovementType[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить движения продукта
 */
export class GetMovementsByProductQuery {
  constructor(
    public readonly data: {
      productId: Types.ObjectId | string;
      sellerId?: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      type?: MovementType | MovementType[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить движения для локации
 */
export class GetMovementsForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      type?: MovementType | MovementType[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить движения по документу
 */
export class GetMovementsByDocumentQuery {
  constructor(
    public readonly data: {
      documentType: MovementDocumentType;
      documentId: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Получить движения продавца
 */
export class GetMovementsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      type?: MovementType | MovementType[];
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить сводку движений
 */
export class GetMovementsSummaryQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      groupBy: 'type' | 'product' | 'day' | 'month';
    },
  ) {}
}

/**
 * Поиск движений
 */
export class SearchMovementsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      type?: MovementType | MovementType[];
      locationType?: LocationType;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}
