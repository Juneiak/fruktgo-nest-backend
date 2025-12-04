import { ReceivingType } from './receiving.enums';

/**
 * Создание документа приёмки (черновик)
 */
export class CreateReceivingCommand {
  constructor(
    public readonly payload: {
      shopId: string;
      type: ReceivingType;
      items: Array<{
        shopProductId: string;
        expectedQuantity: number;
        comment?: string;
      }>;
      supplier?: string;
      supplierInvoice?: string;
      comment?: string;
      createdById: string;
    },
    public readonly receivingId?: string,
  ) {}
}

/**
 * Обновление черновика приёмки
 */
export class UpdateReceivingCommand {
  constructor(
    public readonly receivingId: string,
    public readonly payload: {
      type?: ReceivingType;
      items?: Array<{
        shopProductId: string;
        expectedQuantity: number;
        comment?: string;
      }>;
      supplier?: string;
      supplierInvoice?: string;
      comment?: string;
    },
  ) {}
}

/**
 * Подтверждение приёмки (с указанием фактического количества)
 */
export class ConfirmReceivingCommand {
  constructor(
    public readonly receivingId: string,
    public readonly payload: {
      confirmedById: string;
      /** Фактические количества по позициям */
      actualItems: Array<{
        shopProductId: string;
        actualQuantity: number;
      }>;
    },
  ) {}
}

/**
 * Отмена приёмки
 */
export class CancelReceivingCommand {
  constructor(
    public readonly receivingId: string,
  ) {}
}
