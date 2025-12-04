import { BatchStockLocationType, BatchStockStatus } from './batch-stock.enums';

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════

export class GetBatchStockQuery {
  constructor(public readonly batchStockId: string) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY BATCH
// ═══════════════════════════════════════════════════════════════

export class GetBatchStocksByBatchQuery {
  constructor(public readonly batchId: string) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY LOCATION
// ═══════════════════════════════════════════════════════════════

export class GetBatchStocksByLocationQuery {
  constructor(
    public readonly filters: {
      locationType: BatchStockLocationType;
      shopId?: string;
      warehouseId?: string;
      status?: BatchStockStatus;
      hasStock?: boolean; // quantity > 0
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY SHOP/WAREHOUSE PRODUCT
// ═══════════════════════════════════════════════════════════════

export class GetBatchStocksByShopProductQuery {
  constructor(
    public readonly shopProductId: string,
    public readonly activeOnly: boolean = true,
  ) {}
}

export class GetBatchStocksByWarehouseProductQuery {
  constructor(
    public readonly warehouseProductId: string,
    public readonly activeOnly: boolean = true,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET FOR FIFO (сортировка по сроку годности партии)
// ═══════════════════════════════════════════════════════════════

export class GetBatchStocksForFifoQuery {
  constructor(
    public readonly filters: {
      locationType: BatchStockLocationType;
      shopId?: string;
      warehouseId?: string;
      shopProductId?: string;
      warehouseProductId?: string;
      productId?: string;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET EXPIRING IN LOCATION
// ═══════════════════════════════════════════════════════════════

export class GetExpiringBatchStocksQuery {
  constructor(
    public readonly filters: {
      locationType: BatchStockLocationType;
      shopId?: string;
      warehouseId?: string;
      daysThreshold: number;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// TOTAL BY BATCH (сумма остатков по всем локациям)
// ═══════════════════════════════════════════════════════════════

export class GetTotalStockByBatchQuery {
  constructor(public readonly batchId: string) {}
}
