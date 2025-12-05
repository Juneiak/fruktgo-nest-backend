import { Types } from 'mongoose';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Позиция для создания перемещения
 */
export interface TransferItemInput {
  batch: Types.ObjectId | string;
  product: Types.ObjectId | string;
  quantity: number;
}

/**
 * Создать перемещение (черновик)
 */
export class CreateTransferCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      sourceType: LocationType;
      sourceId: Types.ObjectId | string;
      sourceName?: string;
      targetType: LocationType;
      targetId: Types.ObjectId | string;
      targetName?: string;
      items: TransferItemInput[];
      comment?: string;
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Добавить позицию в перемещение
 */
export class AddTransferItemCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly item: TransferItemInput,
  ) {}
}

/**
 * Обновить позицию
 */
export class UpdateTransferItemCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data: {
      quantity?: number;
    },
  ) {}
}

/**
 * Удалить позицию
 */
export class RemoveTransferItemCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly itemIndex: number,
  ) {}
}

/**
 * Отправить перемещение — товар в пути
 */
export class SendTransferCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly data: {
      sentBy: Types.ObjectId | string;
      /** Уточнённые количества по позициям (опционально) */
      itemQuantities?: Array<{
        itemIndex: number;
        sentQuantity: number;
      }>;
    },
  ) {}
}

/**
 * Получить перемещение — товар прибыл
 */
export class ReceiveTransferCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly data: {
      receivedBy: Types.ObjectId | string;
      /** Уточнённые количества по позициям */
      itemQuantities?: Array<{
        itemIndex: number;
        receivedQuantity: number;
        comment?: string;
      }>;
    },
  ) {}
}

/**
 * Отменить перемещение
 */
export class CancelTransferCommand {
  constructor(
    public readonly transferId: Types.ObjectId | string,
    public readonly data?: {
      reason?: string;
      cancelledBy?: Types.ObjectId | string;
    },
  ) {}
}
