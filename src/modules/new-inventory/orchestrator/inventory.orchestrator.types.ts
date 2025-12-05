import { Types } from 'mongoose';
import { LocationType } from '../batch-location/batch-location.enums';
import { ReceivingType } from '../operations/receiving/receiving.enums';
import { TransferType } from '../operations/transfer/transfer.enums';
import { WriteOffReason } from '../batch/batch.enums';
import { ReturnType, CustomerReturnReason, DeliveryReturnReason, SupplierReturnReason } from '../operations/return/return.enums';
import { AuditType } from '../operations/audit/audit.enums';

// ═══════════════════════════════════════════════════════════════
// ПРИЁМКА
// ═══════════════════════════════════════════════════════════════

export interface CreateReceivingInput {
  seller: Types.ObjectId | string;
  type: ReceivingType;
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  locationName?: string;
  supplier?: string;
  invoiceNumber?: string;
  items: Array<{
    product: Types.ObjectId | string;
    quantity: number;
    purchasePrice?: number;
    productionDate?: Date;
    expirationDate?: Date;
    batchNumber?: string;
  }>;
  expectedAt?: Date;
  comment?: string;
  createdBy?: Types.ObjectId | string;
}

export interface ConfirmReceivingInput {
  receivingId: Types.ObjectId | string;
  confirmedBy: Types.ObjectId | string;
  /** Фактические количества (если отличаются) */
  actualQuantities?: Array<{
    itemIndex: number;
    quantity: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// ПЕРЕМЕЩЕНИЕ
// ═══════════════════════════════════════════════════════════════

export interface CreateTransferInput {
  seller: Types.ObjectId | string;
  type: TransferType;
  sourceLocationType: LocationType;
  sourceLocationId: Types.ObjectId | string;
  sourceLocationName?: string;
  targetLocationType: LocationType;
  targetLocationId: Types.ObjectId | string;
  targetLocationName?: string;
  items: Array<{
    batch: Types.ObjectId | string;
    product: Types.ObjectId | string;
    quantity: number;
  }>;
  comment?: string;
  createdBy?: Types.ObjectId | string;
}

export interface SendTransferInput {
  transferId: Types.ObjectId | string;
  sentBy: Types.ObjectId | string;
}

export interface ReceiveTransferInput {
  transferId: Types.ObjectId | string;
  receivedBy: Types.ObjectId | string;
  /** Фактические количества при получении */
  actualQuantities?: Array<{
    itemIndex: number;
    quantity: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// СПИСАНИЕ
// ═══════════════════════════════════════════════════════════════

export interface CreateWriteOffInput {
  seller: Types.ObjectId | string;
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  locationName?: string;
  reason: WriteOffReason;
  items: Array<{
    batch: Types.ObjectId | string;
    product: Types.ObjectId | string;
    quantity: number;
    purchasePrice?: number;
    comment?: string;
  }>;
  comment?: string;
  createdBy?: Types.ObjectId | string;
}

export interface ConfirmWriteOffInput {
  writeOffId: Types.ObjectId | string;
  confirmedBy: Types.ObjectId | string;
}

// ═══════════════════════════════════════════════════════════════
// ВОЗВРАТ
// ═══════════════════════════════════════════════════════════════

export interface CreateReturnInput {
  seller: Types.ObjectId | string;
  type: ReturnType;
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  locationName?: string;
  order?: Types.ObjectId | string;
  supplier?: string;
  reason: CustomerReturnReason | DeliveryReturnReason | SupplierReturnReason;
  items: Array<{
    batch: Types.ObjectId | string;
    product: Types.ObjectId | string;
    quantity: number;
    minutesOutOfControl?: number;
    purchasePrice?: number;
    comment?: string;
  }>;
  deliveryTimeMinutes?: number;
  comment?: string;
  createdBy?: Types.ObjectId | string;
}

export interface InspectReturnInput {
  returnId: Types.ObjectId | string;
  inspections: Array<{
    itemIndex: number;
    condition: string;
    decision: string;
    discountPercent?: number;
    minutesOutOfControl?: number;
    comment?: string;
    photos?: string[];
  }>;
  inspectedBy: Types.ObjectId | string;
}

export interface CompleteReturnInput {
  returnId: Types.ObjectId | string;
  completedBy: Types.ObjectId | string;
}

// ═══════════════════════════════════════════════════════════════
// ИНВЕНТАРИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════

export interface CreateAuditInput {
  seller: Types.ObjectId | string;
  type: AuditType;
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  locationName?: string;
  filterProducts?: Array<Types.ObjectId | string>;
  filterCategories?: Array<Types.ObjectId | string>;
  filterExpiringWithinDays?: number;
  comment?: string;
  createdBy?: Types.ObjectId | string;
}

export interface StartAuditInput {
  auditId: Types.ObjectId | string;
  startedBy: Types.ObjectId | string;
}

export interface UpdateAuditItemsInput {
  auditId: Types.ObjectId | string;
  items: Array<{
    itemIndex: number;
    actualQuantity: number;
    comment?: string;
  }>;
  countedBy: Types.ObjectId | string;
}

export interface CompleteAuditInput {
  auditId: Types.ObjectId | string;
  completedBy: Types.ObjectId | string;
  applyCorrections?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// РЕЗЕРВИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════

export interface ReserveForOrderInput {
  seller: Types.ObjectId | string;
  order: Types.ObjectId | string;
  customer?: Types.ObjectId | string;
  shop: Types.ObjectId | string;
  shopName?: string;
  products: Array<{
    product: Types.ObjectId | string;
    quantity: number;
  }>;
  ttlMinutes?: number;
}

export interface ReleaseReservationInput {
  orderId: Types.ObjectId | string;
  reason?: 'ORDER_CANCELLED' | 'ORDER_DECLINED' | 'EXPIRED' | 'MANUAL';
}

export interface ConsumeReservationInput {
  orderId: Types.ObjectId | string;
  /** Фактические количества при сборке */
  actualQuantities?: Array<{
    productId: Types.ObjectId | string;
    quantity: number;
  }>;
  consumedBy: Types.ObjectId | string;
}

// ═══════════════════════════════════════════════════════════════
// ОФЛАЙН ПРОДАЖА
// ═══════════════════════════════════════════════════════════════

export interface CheckOfflineSaleConflictInput {
  shop: Types.ObjectId | string;
  products: Array<{
    product: Types.ObjectId | string;
    quantity: number;
  }>;
}

export interface OfflineSaleConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    productId: string;
    requestedQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    /** Заказы, чьи резервы будут затронуты */
    affectedOrders: string[];
  }>;
}

export interface ProcessOfflineSaleInput {
  seller: Types.ObjectId | string;
  shop: Types.ObjectId | string;
  products: Array<{
    product: Types.ObjectId | string;
    quantity: number;
  }>;
  /** Перехватить резервы если нужно */
  overrideReservations?: boolean;
  processedBy: Types.ObjectId | string;
}

// ═══════════════════════════════════════════════════════════════
// ОСТАТКИ
// ═══════════════════════════════════════════════════════════════

export interface GetLocationStockInput {
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  productId?: Types.ObjectId | string;
}

export interface LocationStockResult {
  locationType: LocationType;
  locationId: string;
  locationName?: string;
  products: Array<{
    productId: string;
    totalQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    batches: Array<{
      batchId: string;
      batchLocationId: string;
      batchNumber?: string;
      quantity: number;
      reservedQuantity: number;
      expirationDate: Date;
      daysUntilExpiration: number;
      alertLevel: string;
    }>;
  }>;
  totalValue: number;
}

export interface GetProductStockInput {
  seller: Types.ObjectId | string;
  product: Types.ObjectId | string;
  locationType?: LocationType;
  locationId?: Types.ObjectId | string;
}

export interface ProductStockResult {
  productId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  byLocation: Array<{
    locationType: LocationType;
    locationId: string;
    locationName?: string;
    quantity: number;
    reservedQuantity: number;
    batches: Array<{
      batchId: string;
      batchNumber?: string;
      quantity: number;
      expirationDate: Date;
    }>;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// СМЕШИВАНИЕ ПАРТИЙ
// ═══════════════════════════════════════════════════════════════

export interface MixBatchesInput {
  seller: Types.ObjectId | string;
  product: Types.ObjectId | string;
  locationType: LocationType;
  locationId: Types.ObjectId | string;
  sourceBatches: Array<{
    batchId: Types.ObjectId | string;
    quantity: number;
  }>;
  mixedBy: Types.ObjectId | string;
  reason?: string;
}

export interface MixBatchesResult {
  mixedBatch: {
    batchId: string;
    batchNumber: string;
    quantity: number;
    effectiveExpirationDate: Date;
    freshnessRemaining: number;
  };
  consumedBatches: Array<{
    batchId: string;
    consumedQuantity: number;
  }>;
}
