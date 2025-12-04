import { WriteOffReason } from './write-off.enums';

/**
 * Создание документа списания (черновик)
 */
export class CreateWriteOffCommand {
  constructor(
    public readonly payload: {
      shopId: string;
      reason: WriteOffReason;
      items: Array<{
        shopProductId: string;
        quantity: number;
        reason: WriteOffReason;
        comment?: string;
        photos?: string[];
      }>;
      comment?: string;
      createdById: string;
    },
    public readonly writeOffId?: string,
  ) {}
}

/**
 * Обновление черновика списания
 */
export class UpdateWriteOffCommand {
  constructor(
    public readonly writeOffId: string,
    public readonly payload: {
      reason?: WriteOffReason;
      items?: Array<{
        shopProductId: string;
        quantity: number;
        reason: WriteOffReason;
        comment?: string;
        photos?: string[];
      }>;
      comment?: string;
    },
  ) {}
}

/**
 * Подтверждение списания (списывает остатки)
 */
export class ConfirmWriteOffCommand {
  constructor(
    public readonly writeOffId: string,
    public readonly payload: {
      confirmedById: string;
    },
  ) {}
}

/**
 * Отмена списания
 */
export class CancelWriteOffCommand {
  constructor(
    public readonly writeOffId: string,
  ) {}
}
