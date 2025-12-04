import { WriteOffStatus, WriteOffReason } from './write-off.enums';

/**
 * Получение документа списания по ID
 */
export class GetWriteOffQuery {
  constructor(
    public readonly writeOffId: string,
    public readonly options?: {
      populateItems?: boolean;
    },
  ) {}
}

/**
 * Получение списка документов списания
 */
export class GetWriteOffsQuery {
  constructor(
    public readonly filters: {
      shopId?: string;
      status?: WriteOffStatus;
      reason?: WriteOffReason;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {}
}

/**
 * Получение документа по номеру
 */
export class GetWriteOffByNumberQuery {
  constructor(
    public readonly documentNumber: string,
  ) {}
}
