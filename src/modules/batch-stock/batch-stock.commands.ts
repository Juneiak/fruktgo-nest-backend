import { BatchStockLocationType } from './batch-stock.enums';

// ═══════════════════════════════════════════════════════════════
// CREATE (при приёмке партии)
// ═══════════════════════════════════════════════════════════════

export class CreateBatchStockCommand {
  constructor(
    public readonly data: {
      batchId: string;
      locationType: BatchStockLocationType;
      shopId?: string;
      warehouseId?: string;
      shopProductId?: string;
      warehouseProductId?: string;
      quantity: number;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// ADJUST QUANTITY (приход/расход)
// ═══════════════════════════════════════════════════════════════

export class AdjustBatchStockCommand {
  constructor(
    public readonly batchStockId: string,
    public readonly adjustment: number, // + или -
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// RESERVE/RELEASE (резервирование)
// ═══════════════════════════════════════════════════════════════

export class ReserveBatchStockCommand {
  constructor(
    public readonly batchStockId: string,
    public readonly quantity: number,
  ) {}
}

export class ReleaseBatchStockReserveCommand {
  constructor(
    public readonly batchStockId: string,
    public readonly quantity: number,
  ) {}
}

export class ConfirmBatchStockReserveCommand {
  constructor(
    public readonly batchStockId: string,
    public readonly quantity: number,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER (перемещение партии между локациями)
// ═══════════════════════════════════════════════════════════════

export class TransferBatchStockCommand {
  constructor(
    public readonly data: {
      batchId: string;
      fromLocationType: BatchStockLocationType;
      fromShopId?: string;
      fromWarehouseId?: string;
      toLocationType: BatchStockLocationType;
      toShopId?: string;
      toWarehouseId?: string;
      toShopProductId?: string;
      toWarehouseProductId?: string;
      quantity: number;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// CONSUME FIFO (списание по FIFO)
// ═══════════════════════════════════════════════════════════════

/**
 * Списать N единиц товара из локации по FIFO
 * Автоматически выбирает партии с ближайшим сроком годности
 */
export class ConsumeFifoCommand {
  constructor(
    public readonly data: {
      locationType: BatchStockLocationType;
      shopId?: string;
      warehouseId?: string;
      shopProductId?: string;
      warehouseProductId?: string;
      productId: string; // Для фильтрации партий
      quantity: number;
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// WRITE OFF BATCH (списание конкретной партии)
// ═══════════════════════════════════════════════════════════════

export class WriteOffBatchStockCommand {
  constructor(
    public readonly batchStockId: string,
    public readonly quantity: number,
    public readonly reason: string,
  ) {}
}
