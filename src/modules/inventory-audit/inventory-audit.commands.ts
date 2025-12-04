import { InventoryAuditType } from './inventory-audit.enums';

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateInventoryAuditCommand {
  constructor(
    public readonly payload: {
      shopId: string;
      type: InventoryAuditType;
      /** Для PARTIAL - список shopProductId для проверки */
      shopProductIds?: string[];
      comment?: string;
      createdById: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// START (DRAFT → IN_PROGRESS)
// ═══════════════════════════════════════════════════════════════

export class StartInventoryAuditCommand {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly payload: {
      startedById: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// UPDATE ITEM COUNT
// ═══════════════════════════════════════════════════════════════

export class UpdateItemCountCommand {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly payload: {
      shopProductId: string;
      actualQuantity: number;
      comment?: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// BULK UPDATE ITEM COUNTS
// ═══════════════════════════════════════════════════════════════

export class BulkUpdateItemCountsCommand {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly items: Array<{
      shopProductId: string;
      actualQuantity: number;
      comment?: string;
    }>
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// COMPLETE (IN_PROGRESS → COMPLETED)
// ═══════════════════════════════════════════════════════════════

export class CompleteInventoryAuditCommand {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly payload: {
      completedById: string;
      /** Применить результаты к остаткам */
      applyResults?: boolean;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// CANCEL
// ═══════════════════════════════════════════════════════════════

export class CancelInventoryAuditCommand {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly payload: {
      cancelledById: string;
      reason?: string;
    }
  ) {}
}
