import { Types } from 'mongoose';
import {
  MovementType,
  MovementDocumentType,
  MovementActorType,
} from './movement.enums';
import { LocationType } from '../batch-location/batch-location.enums';

/**
 * Информация о документе-источнике
 */
export interface DocumentRefInput {
  type: MovementDocumentType;
  id: Types.ObjectId | string;
  documentNumber?: string;
}

/**
 * Информация об акторе
 */
export interface ActorInput {
  type: MovementActorType;
  id?: Types.ObjectId | string;
  name?: string;
}

/**
 * Записать движение
 */
export class RecordMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      type: MovementType;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation?: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      quantityChange: number;
      balanceBefore: number;
      balanceAfter: number;
      reservedBefore?: number;
      reservedAfter?: number;
      document?: DocumentRefInput;
      actor: ActorInput;
      comment?: string;
    },
  ) {}
}

/**
 * Записать несколько движений (bulk)
 */
export class BulkRecordMovementsCommand {
  constructor(
    public readonly movements: Array<{
      seller: Types.ObjectId | string;
      type: MovementType;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation?: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      quantityChange: number;
      balanceBefore: number;
      balanceAfter: number;
      reservedBefore?: number;
      reservedAfter?: number;
      document?: DocumentRefInput;
      actor: ActorInput;
      comment?: string;
    }>,
  ) {}
}

/**
 * Записать движение приёмки
 */
export class RecordReceivingMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      quantity: number;
      balanceAfter: number;
      receivingId: Types.ObjectId | string;
      receivingDocumentNumber?: string;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать движение перемещения (исходящее)
 */
export class RecordTransferOutMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      transferId: Types.ObjectId | string;
      transferDocumentNumber?: string;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать движение перемещения (входящее)
 */
export class RecordTransferInMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      balanceAfter: number;
      transferId: Types.ObjectId | string;
      transferDocumentNumber?: string;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать движение списания
 */
export class RecordWriteOffMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      writeOffId: Types.ObjectId | string;
      writeOffDocumentNumber?: string;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать движение продажи
 */
export class RecordSaleMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      balanceBefore: number;
      balanceAfter: number;
      reservedBefore?: number;
      reservedAfter?: number;
      orderId: Types.ObjectId | string;
      isOffline?: boolean;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать движение резервирования
 */
export class RecordReservationMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      reservedBefore: number;
      reservedAfter: number;
      reservationId: Types.ObjectId | string;
      orderId: Types.ObjectId | string;
      actor: ActorInput;
    },
  ) {}
}

/**
 * Записать снятие резерва
 */
export class RecordReservationReleaseMovementCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      batch: Types.ObjectId | string;
      product: Types.ObjectId | string;
      batchLocation: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      quantity: number;
      reservedBefore: number;
      reservedAfter: number;
      reservationId: Types.ObjectId | string;
      orderId: Types.ObjectId | string;
      /** Причина снятия: cancelled, expired, confirmed */
      reason: 'cancelled' | 'expired' | 'confirmed';
      actor: ActorInput;
    },
  ) {}
}
