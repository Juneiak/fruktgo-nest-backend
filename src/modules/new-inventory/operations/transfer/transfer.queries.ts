import { Types } from 'mongoose';
import { TransferStatus, TransferType } from './transfer.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Получить перемещение по ID
 */
export class GetTransferByIdQuery {
  constructor(public readonly transferId: Types.ObjectId | string) {}
}

/**
 * Получить перемещение по номеру документа
 */
export class GetTransferByDocumentNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly documentNumber: string,
  ) {}
}

/**
 * Получить перемещения продавца
 */
export class GetTransfersBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: TransferStatus | TransferStatus[];
      type?: TransferType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'sentAt' | 'receivedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить перемещения для локации (входящие или исходящие)
 */
export class GetTransfersForLocationQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      /** Направление: входящие или исходящие */
      direction: 'incoming' | 'outgoing' | 'both';
      status?: TransferStatus | TransferStatus[];
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить ожидающие получения перемещения
 */
export class GetPendingTransfersQuery {
  constructor(
    public readonly data: {
      locationType: LocationType;
      locationId: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Поиск перемещений
 */
export class SearchTransfersQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      status?: TransferStatus | TransferStatus[];
      type?: TransferType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}
