import { Types } from 'mongoose';
import { ReceivingStatus, ReceivingType } from './receiving.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Получить приёмку по ID
 */
export class GetReceivingByIdQuery {
  constructor(public readonly receivingId: Types.ObjectId | string) {}
}

/**
 * Получить приёмку по номеру документа
 */
export class GetReceivingByDocumentNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly documentNumber: string,
  ) {}
}

/**
 * Получить приёмки продавца
 */
export class GetReceivingsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: ReceivingStatus | ReceivingStatus[];
      type?: ReceivingType;
      destinationType?: LocationType;
      destinationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'confirmedAt' | 'documentNumber';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить приёмки для локации
 */
export class GetReceivingsForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      status?: ReceivingStatus | ReceivingStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Поиск приёмок
 */
export class SearchReceivingsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string; // по documentNumber, supplier, supplierInvoice
      status?: ReceivingStatus | ReceivingStatus[];
      type?: ReceivingType;
      supplier?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить черновики приёмок
 */
export class GetDraftReceivingsQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly limit?: number,
  ) {}
}
