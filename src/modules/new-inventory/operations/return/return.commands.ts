import { Types } from 'mongoose';
import {
  ReturnType,
  ItemCondition,
  ReturnItemDecision,
  CustomerReturnReason,
  DeliveryReturnReason,
  SupplierReturnReason,
} from './return.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Позиция для создания возврата
 */
export interface ReturnItemInput {
  batch: Types.ObjectId | string;
  product: Types.ObjectId | string;
  quantity: number;
  minutesOutOfControl?: number;
  purchasePrice?: number;
  comment?: string;
  photos?: string[];
}

/**
 * Создать возврат от клиента
 */
export class CreateCustomerReturnCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      order: Types.ObjectId | string;
      reason: CustomerReturnReason;
      items: ReturnItemInput[];
      comment?: string;
      photos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Создать возврат от курьера
 */
export class CreateDeliveryReturnCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      order: Types.ObjectId | string;
      reason: DeliveryReturnReason;
      items: ReturnItemInput[];
      /** Время в пути (минуты) — для расчёта потери свежести */
      deliveryTimeMinutes?: number;
      comment?: string;
      photos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Создать возврат поставщику
 */
export class CreateSupplierReturnCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      receiving?: Types.ObjectId | string;
      supplier: string;
      reason: SupplierReturnReason;
      items: ReturnItemInput[];
      comment?: string;
      photos?: string[];
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Осмотреть позицию и принять решение
 */
export class InspectReturnItemCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data: {
      condition: ItemCondition;
      decision: ReturnItemDecision;
      discountPercent?: number;
      minutesOutOfControl?: number;
      comment?: string;
      photos?: string[];
      inspectedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Осмотреть все позиции и завершить осмотр
 */
export class CompleteInspectionCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly data: {
      inspections: Array<{
        itemIndex: number;
        condition: ItemCondition;
        decision: ReturnItemDecision;
        discountPercent?: number;
        minutesOutOfControl?: number;
        comment?: string;
        photos?: string[];
      }>;
      inspectedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Завершить возврат — обработать позиции согласно решениям
 */
export class CompleteReturnCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly data: {
      completedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Отклонить возврат поставщику (поставщик отказал)
 */
export class RejectSupplierReturnCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly data: {
      supplierResponse: string;
      rejectedBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Подтвердить возврат поставщику (поставщик принял)
 */
export class ApproveSupplierReturnCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly data: {
      supplierResponse?: string;
      approvedBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Отменить возврат
 */
export class CancelReturnCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly data?: {
      reason?: string;
      cancelledBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Добавить фото к возврату
 */
export class AddReturnPhotosCommand {
  constructor(
    public readonly returnId: Types.ObjectId | string,
    public readonly photos: string[],
  ) {}
}
