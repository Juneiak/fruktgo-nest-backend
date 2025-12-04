import { WriteOffReason } from 'src/modules/write-off';
import { ReceivingType } from 'src/modules/receiving';

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF
// ═══════════════════════════════════════════════════════════════

export interface CreateWriteOffInput {
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
  employeeId: string;
  employeeName: string;
}

export interface ConfirmWriteOffInput {
  writeOffId: string;
  employeeId: string;
  employeeName: string;
}

export interface ConfirmWriteOffResult {
  writeOffId: string;
  documentNumber: string;
  totalItemsWrittenOff: number;
}

// ═══════════════════════════════════════════════════════════════
// RECEIVING
// ═══════════════════════════════════════════════════════════════

export interface CreateReceivingInput {
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
  employeeId: string;
  employeeName: string;
}

export interface ConfirmReceivingInput {
  receivingId: string;
  actualItems: Array<{
    shopProductId: string;
    actualQuantity: number;
  }>;
  employeeId: string;
  employeeName: string;
}

export interface ConfirmReceivingResult {
  receivingId: string;
  documentNumber: string;
  totalItemsReceived: number;
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════

export interface CreateTransferInput {
  sourceShopId: string;
  targetShopId: string;
  items: Array<{
    shopProductId: string;
    quantity: number;
    comment?: string;
  }>;
  comment?: string;
  employeeId: string;
  employeeName: string;
}

export interface SendTransferInput {
  transferId: string;
  employeeId: string;
  employeeName: string;
}

export interface SendTransferResult {
  transferId: string;
  documentNumber: string;
  totalItemsSent: number;
}

export interface ReceiveTransferInput {
  transferId: string;
  employeeId: string;
  employeeName: string;
}

export interface ReceiveTransferResult {
  transferId: string;
  documentNumber: string;
  totalItemsReceived: number;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY AUDIT
// ═══════════════════════════════════════════════════════════════

import { InventoryAuditType } from 'src/modules/inventory-audit';

export interface CreateInventoryAuditInput {
  shopId: string;
  type: InventoryAuditType;
  shopProductIds?: string[];
  comment?: string;
  employeeId: string;
}

export interface CompleteInventoryAuditInput {
  inventoryAuditId: string;
  applyResults: boolean;
  employeeId: string;
  employeeName: string;
}

export interface CompleteInventoryAuditResult {
  inventoryAuditId: string;
  documentNumber: string;
  totalItems: number;
  surplusItems: number;
  shortageItems: number;
  matchedItems: number;
}
