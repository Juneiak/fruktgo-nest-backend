import { WarehouseStatus } from './warehouse.enums';

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseQuery {
  constructor(public readonly warehouseId: string) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY EXTERNAL CODE
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseByExternalCodeQuery {
  constructor(
    public readonly sellerId: string,
    public readonly externalCode: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET LIST
// ═══════════════════════════════════════════════════════════════

export class GetWarehousesQuery {
  constructor(
    public readonly filters: {
      sellerId?: string;
      status?: WarehouseStatus;
      city?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY SELLER
// ═══════════════════════════════════════════════════════════════

export class GetWarehousesBySellerQuery {
  constructor(
    public readonly sellerId: string,
    public readonly activeOnly: boolean = true,
  ) {}
}
