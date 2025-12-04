import { WarehouseProductStatus } from './warehouse-product.enums';

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateWarehouseProductCommand {
  constructor(
    public readonly data: {
      warehouseId: string;
      productId: string;
      stockQuantity?: number;
      externalCode?: string;
      minStockLevel?: number;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

export class UpdateWarehouseProductCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly data: {
      externalCode?: string;
      minStockLevel?: number;
      status?: WarehouseProductStatus;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// STOCK OPERATIONS
// ═══════════════════════════════════════════════════════════════

export class AdjustStockQuantityCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly adjustment: number,
  ) {}
}

export class BulkAdjustStockQuantityCommand {
  constructor(
    public readonly adjustments: Array<{
      warehouseProductId: string;
      adjustment: number;
    }>,
  ) {}
}

export class SetStockQuantityCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly quantity: number,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// RESERVE OPERATIONS
// ═══════════════════════════════════════════════════════════════

export class ReserveStockCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly quantity: number,
  ) {}
}

export class ReleaseReserveCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly quantity: number,
  ) {}
}

export class ConfirmReserveCommand {
  constructor(
    public readonly warehouseProductId: string,
    public readonly quantity: number,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// BULK CREATE/UPSERT (для импорта)
// ═══════════════════════════════════════════════════════════════

export class BulkUpsertWarehouseProductsCommand {
  constructor(
    public readonly warehouseId: string,
    public readonly items: Array<{
      productId: string;
      stockQuantity: number;
      externalCode?: string;
      minStockLevel?: number;
    }>,
  ) {}
}
