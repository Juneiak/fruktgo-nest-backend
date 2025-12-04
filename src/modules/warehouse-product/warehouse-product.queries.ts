import { WarehouseProductStatus } from './warehouse-product.enums';

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseProductQuery {
  constructor(public readonly warehouseProductId: string) {}
}

export class GetWarehouseProductsByIdsQuery {
  constructor(public readonly warehouseProductIds: string[]) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY WAREHOUSE
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseProductsQuery {
  constructor(
    public readonly filters: {
      warehouseId?: string;
      productId?: string;
      status?: WarehouseProductStatus;
      hasStock?: boolean; // stockQuantity > 0
      belowMinStock?: boolean; // stockQuantity < minStockLevel
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY WAREHOUSE AND PRODUCT
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseProductByProductQuery {
  constructor(
    public readonly warehouseId: string,
    public readonly productId: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY EXTERNAL CODE
// ═══════════════════════════════════════════════════════════════

export class GetWarehouseProductByExternalCodeQuery {
  constructor(
    public readonly warehouseId: string,
    public readonly externalCode: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// LOW STOCK
// ═══════════════════════════════════════════════════════════════

export class GetLowStockWarehouseProductsQuery {
  constructor(public readonly warehouseId: string) {}
}
