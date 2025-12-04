import { InventoryAuditStatus, InventoryAuditType } from './inventory-audit.enums';

// ═══════════════════════════════════════════════════════════════
// GET ONE
// ═══════════════════════════════════════════════════════════════

export class GetInventoryAuditQuery {
  constructor(
    public readonly inventoryAuditId: string,
    public readonly options?: {
      populateItems?: boolean;
    }
  ) {}
}

export class GetInventoryAuditByDocumentNumberQuery {
  constructor(
    public readonly documentNumber: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET LIST
// ═══════════════════════════════════════════════════════════════

export class GetInventoryAuditsQuery {
  constructor(
    public readonly filters: {
      shopId?: string;
      status?: InventoryAuditStatus;
      type?: InventoryAuditType;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET ACTIVE
// ═══════════════════════════════════════════════════════════════

/**
 * Получить активную инвентаризацию для магазина (DRAFT или IN_PROGRESS)
 */
export class GetActiveInventoryAuditQuery {
  constructor(
    public readonly shopId: string,
  ) {}
}
