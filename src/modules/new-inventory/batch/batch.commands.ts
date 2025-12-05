import { Types } from 'mongoose';
import { BatchStatus, FreshnessAdjustmentReason } from './batch.enums';

/**
 * Создать партию (при приёмке)
 */
export class CreateBatchCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchNumber: string;
      productionDate?: Date;
      receivedAt: Date;
      originalExpirationDate: Date;
      effectiveExpirationDate: Date;
      freshnessRemaining: number;
      initialFreshness: number;
      initialQuantity: number;
      currentQuantity: number;
      supplier?: string;
      supplierInvoice?: string;
      purchasePrice?: number;
      receivingId?: Types.ObjectId | string;
      qrCode?: string;
      currentLocation?: {
        locationType: 'SHOP' | 'WAREHOUSE';
        locationId: Types.ObjectId | string;
        locationName?: string;
        arrivedAt: Date;
        degradationCoefficient: number;
      };
    },
  ) {}
}

/**
 * Обновить количество партии
 */
export class UpdateBatchQuantityCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      /** Изменение количества (может быть отрицательным) */
      quantityDelta: number;
      /** Причина изменения */
      reason: string;
      /** Кто изменил */
      changedBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Обновить свежесть партии (автоматический пересчёт)
 */
export class UpdateBatchFreshnessCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      freshnessRemaining: number;
      effectiveExpirationDate: Date;
      freshnessLastCalculatedAt: Date;
    },
  ) {}
}

/**
 * Ручная корректировка свежести
 */
export class AdjustFreshnessManuallyCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      newFreshness: number;
      reason: FreshnessAdjustmentReason;
      comment?: string;
      adjustedBy: Types.ObjectId | string;
      adjustedByRole?: string;
    },
  ) {}
}

/**
 * Изменить статус партии
 */
export class UpdateBatchStatusCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      status: BatchStatus;
      blockReason?: string;
      statusComment?: string;
    },
  ) {}
}

/**
 * Переместить партию в другую локацию
 */
export class MoveBatchToLocationCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      newLocation: {
        locationType: 'SHOP' | 'WAREHOUSE';
        locationId: Types.ObjectId | string;
        locationName?: string;
        degradationCoefficient: number;
      };
      moveDate: Date;
      /** Новая свежесть после пересчёта */
      newFreshnessRemaining: number;
      /** Новый срок годности после пересчёта */
      newEffectiveExpirationDate: Date;
    },
  ) {}
}

/**
 * Создать смешанную партию (MixedBatch)
 */
export class CreateMixedBatchCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      sourceBatches: Array<{
        batchId: Types.ObjectId | string;
        quantity: number;
      }>;
      mixingReason: string;
      location: {
        locationType: 'SHOP' | 'WAREHOUSE';
        locationId: Types.ObjectId | string;
        locationName?: string;
        degradationCoefficient: number;
      };
    },
  ) {}
}

/**
 * Пометить партию как истёкшую
 */
export class MarkBatchExpiredCommand {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}

/**
 * Пометить партию как израсходованную
 */
export class MarkBatchDepletedCommand {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}

/**
 * Заблокировать партию
 */
export class BlockBatchCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      reason: string;
      comment?: string;
      /** Использовать статус DISPUTE вместо BLOCKED */
      isDispute?: boolean;
    },
  ) {}
}

/**
 * Разблокировать партию
 */
export class UnblockBatchCommand {
  constructor(
    public readonly batchId: Types.ObjectId | string,
    public readonly data: {
      comment?: string;
    },
  ) {}
}

/**
 * Сгенерировать QR-код для партии
 */
export class GenerateBatchQRCodeCommand {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}
