import { ReceivingStatus, ReceivingType } from './receiving.enums';

/**
 * Получение документа приёмки по ID
 */
export class GetReceivingQuery {
  constructor(
    public readonly receivingId: string,
    public readonly options?: {
      populateItems?: boolean;
    },
  ) {}
}

/**
 * Получение списка документов приёмки
 */
export class GetReceivingsQuery {
  constructor(
    public readonly filters: {
      shopId?: string;
      status?: ReceivingStatus;
      type?: ReceivingType;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {}
}

/**
 * Получение документа по номеру
 */
export class GetReceivingByNumberQuery {
  constructor(
    public readonly documentNumber: string,
  ) {}
}
