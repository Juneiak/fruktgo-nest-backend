import { Types } from 'mongoose';
import { ReceivingType } from './receiving.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Позиция для создания приёмки
 */
export interface ReceivingItemInput {
  product: Types.ObjectId | string;
  expectedQuantity: number;
  actualQuantity?: number;
  expirationDate: Date;
  productionDate?: Date;
  supplierBatchNumber?: string;
  purchasePrice?: number;
  comment?: string;
  photos?: string[];
}

/**
 * Создать приёмку (черновик)
 */
export class CreateReceivingCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      type?: ReceivingType;
      destinationType: LocationType;
      destinationId: Types.ObjectId | string;
      destinationName?: string;
      supplier?: string;
      supplierInvoice?: string;
      supplierInvoiceDate?: Date;
      items: ReceivingItemInput[];
      comment?: string;
      documentPhotos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Обновить черновик приёмки
 */
export class UpdateReceivingCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly data: {
      supplier?: string;
      supplierInvoice?: string;
      supplierInvoiceDate?: Date;
      comment?: string;
      documentPhotos?: string[];
    },
  ) {}
}

/**
 * Добавить позицию в приёмку
 */
export class AddReceivingItemCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly item: ReceivingItemInput,
  ) {}
}

/**
 * Обновить позицию в приёмке
 */
export class UpdateReceivingItemCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data: Partial<ReceivingItemInput>,
  ) {}
}

/**
 * Удалить позицию из приёмки
 */
export class RemoveReceivingItemCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly itemIndex: number,
  ) {}
}

/**
 * Обновить фактическое количество
 */
export class UpdateActualQuantityCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly actualQuantity: number,
  ) {}
}

/**
 * Подтвердить приёмку — создаёт партии и BatchLocation
 */
export class ConfirmReceivingCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly data: {
      confirmedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Отменить приёмку
 */
export class CancelReceivingCommand {
  constructor(
    public readonly receivingId: Types.ObjectId | string,
    public readonly data?: {
      reason?: string;
      cancelledBy?: Types.ObjectId | string;
    },
  ) {}
}
