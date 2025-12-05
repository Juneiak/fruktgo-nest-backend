import { Types } from 'mongoose';
import { LocationType, QuantityChangeReason } from './batch-location.enums';

/**
 * Создать запись остатка партии в локации
 */
export class CreateBatchLocationCommand {
  constructor(
    public readonly data: {
      batch: Types.ObjectId | string;
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      shop?: Types.ObjectId | string;
      warehouse?: Types.ObjectId | string;
      locationName?: string;
      quantity: number;
      degradationCoefficient: number;
      arrivedAt: Date;
      effectiveExpirationDate: Date;
      freshnessRemaining: number;
      purchasePrice?: number;
    },
  ) {}
}

/**
 * Изменить количество (универсальная команда)
 */
export class ChangeQuantityCommand {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
    public readonly data: {
      quantityDelta: number;
      reason: QuantityChangeReason;
      changedBy?: Types.ObjectId | string;
      referenceId?: Types.ObjectId | string;
      referenceType?: string;
      comment?: string;
    },
  ) {}
}

/**
 * Списать по FEFO (First Expired, First Out)
 * Возвращает список затронутых BatchLocation с количествами
 */
export class ConsumeByFefoCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      reason: QuantityChangeReason;
      changedBy?: Types.ObjectId | string;
      referenceId?: Types.ObjectId | string;
      referenceType?: string;
      /** Использовать только незарезервированное количество */
      useAvailableOnly?: boolean;
    },
  ) {}
}

/**
 * Зарезервировать по FEFO
 */
export class ReserveByFefoCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      orderId: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Снять резерв
 */
export class ReleaseReservationCommand {
  constructor(
    public readonly data: {
      orderId: Types.ObjectId | string;
      /** Конкретные batchLocationIds (опционально) */
      batchLocationIds?: Array<Types.ObjectId | string>;
      /** Причина снятия */
      reason?: 'ORDER_CANCELLED' | 'ORDER_COMPLETED' | 'OFFLINE_PRIORITY' | 'TIMEOUT';
    },
  ) {}
}

/**
 * Принудительно снять резерв (приоритет офлайн)
 */
export class ForceReleaseReservationCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      reason: string;
    },
  ) {}
}

/**
 * Обновить денормализованные данные из партии
 */
export class SyncFromBatchCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      effectiveExpirationDate?: Date;
      freshnessRemaining?: number;
    },
  ) {}
}

/**
 * Перенести остаток в другую локацию
 */
export class TransferToLocationCommand {
  constructor(
    public readonly sourceBatchLocationId: Types.ObjectId | string,
    public readonly data: {
      targetLocationType: LocationType;
      targetLocationId: Types.ObjectId | string;
      targetLocationName?: string;
      quantity: number;
      newDegradationCoefficient: number;
      transferId?: Types.ObjectId | string;
      transferredBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Списать усушку
 */
export class ApplyShrinkageCommand {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
    public readonly data: {
      shrinkageQuantity: number;
    },
  ) {}
}

/**
 * Пометить как израсходованный
 */
export class MarkDepletedCommand {
  constructor(public readonly batchLocationId: Types.ObjectId | string) {}
}

/**
 * Зарезервировать количество
 */
export class ReserveQuantityCommand {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
    public readonly quantity: number,
  ) {}
}

/**
 * Снять резерв (освободить зарезервированное количество)
 */
export class ReleaseReserveCommand {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
    public readonly quantity: number,
  ) {}
}

/**
 * Подтвердить резерв (списать зарезервированное количество)
 */
export class ConfirmReserveCommand {
  constructor(
    public readonly batchLocationId: Types.ObjectId | string,
    public readonly quantity: number,
  ) {}
}
