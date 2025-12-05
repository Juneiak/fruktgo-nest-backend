import { Types } from 'mongoose';
import { WriteOffReason } from '../../batch/batch.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Позиция для создания списания
 */
export interface WriteOffItemInput {
  batch: Types.ObjectId | string;
  product: Types.ObjectId | string;
  quantity: number;
  reason?: WriteOffReason;
  purchasePrice?: number;
  comment?: string;
  photos?: string[];
}

/**
 * Создать списание (черновик)
 */
export class CreateWriteOffCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      reason: WriteOffReason;
      items: WriteOffItemInput[];
      comment?: string;
      documentPhotos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Добавить позицию в списание
 */
export class AddWriteOffItemCommand {
  constructor(
    public readonly writeOffId: Types.ObjectId | string,
    public readonly item: WriteOffItemInput,
  ) {}
}

/**
 * Обновить позицию
 */
export class UpdateWriteOffItemCommand {
  constructor(
    public readonly writeOffId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data: {
      quantity?: number;
      reason?: WriteOffReason;
      comment?: string;
      photos?: string[];
    },
  ) {}
}

/**
 * Удалить позицию
 */
export class RemoveWriteOffItemCommand {
  constructor(
    public readonly writeOffId: Types.ObjectId | string,
    public readonly itemIndex: number,
  ) {}
}

/**
 * Подтвердить списание — списывает товар из BatchLocation
 */
export class ConfirmWriteOffCommand {
  constructor(
    public readonly writeOffId: Types.ObjectId | string,
    public readonly data: {
      confirmedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Отменить списание
 */
export class CancelWriteOffCommand {
  constructor(
    public readonly writeOffId: Types.ObjectId | string,
    public readonly data?: {
      reason?: string;
      cancelledBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Создать автоматическое списание истёкших партий
 */
export class CreateAutoWriteOffForExpiredCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      /** Автоподтверждение */
      autoConfirm?: boolean;
    },
  ) {}
}
