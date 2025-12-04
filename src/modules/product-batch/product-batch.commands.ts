import { ProductBatchStatus } from './product-batch.enums';

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateProductBatchCommand {
  constructor(
    public readonly data: {
      sellerId: string;
      productId: string;
      batchNumber: string;
      expirationDate: Date;
      initialQuantity: number;
      productionDate?: Date;
      supplier?: string;
      supplierInvoice?: string;
      purchasePrice?: number;
      externalCode?: string;
      comment?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export class UpdateProductBatchCommand {
  constructor(
    public readonly batchId: string,
    public readonly data: {
      supplier?: string;
      supplierInvoice?: string;
      purchasePrice?: number;
      externalCode?: string;
      comment?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════

export class UpdateProductBatchStatusCommand {
  constructor(
    public readonly batchId: string,
    public readonly status: ProductBatchStatus,
    public readonly reason?: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// BLOCK/UNBLOCK
// ═══════════════════════════════════════════════════════════════

export class BlockProductBatchCommand {
  constructor(
    public readonly batchId: string,
    public readonly reason: string,
  ) {}
}

export class UnblockProductBatchCommand {
  constructor(public readonly batchId: string) {}
}

// ═══════════════════════════════════════════════════════════════
// EXPIRE (автоматически по расписанию)
// ═══════════════════════════════════════════════════════════════

export class ExpireProductBatchesCommand {
  constructor(
    public readonly sellerId?: string, // Если не указан — для всех
  ) {}
}
