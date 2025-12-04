import { ProductBatchStatus, ExpirationAlertLevel } from './product-batch.enums';

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════

export class GetProductBatchQuery {
  constructor(public readonly batchId: string) {}
}

// ═══════════════════════════════════════════════════════════════
// GET BY BATCH NUMBER
// ═══════════════════════════════════════════════════════════════

export class GetProductBatchByNumberQuery {
  constructor(
    public readonly sellerId: string,
    public readonly batchNumber: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET LIST
// ═══════════════════════════════════════════════════════════════

export class GetProductBatchesQuery {
  constructor(
    public readonly filters: {
      sellerId?: string;
      productId?: string;
      status?: ProductBatchStatus;
      alertLevel?: ExpirationAlertLevel;
      supplier?: string;
      expiringWithinDays?: number; // Партии, истекающие в течение N дней
    },
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET FOR FIFO (сортировка по сроку годности)
// ═══════════════════════════════════════════════════════════════

export class GetActiveBatchesForProductQuery {
  constructor(
    public readonly sellerId: string,
    public readonly productId: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET EXPIRING SOON
// ═══════════════════════════════════════════════════════════════

export class GetExpiringSoonBatchesQuery {
  constructor(
    public readonly sellerId: string,
    public readonly daysThreshold: number = 7,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

export class GetBatchStatisticsQuery {
  constructor(
    public readonly sellerId: string,
    public readonly productId?: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
  ) {}
}
