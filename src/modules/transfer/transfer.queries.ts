import { TransferStatus } from './transfer.enums';

// ═══════════════════════════════════════════════════════════════
// GET ONE
// ═══════════════════════════════════════════════════════════════

export class GetTransferQuery {
  constructor(
    public readonly transferId: string,
    public readonly options?: {
      populateItems?: boolean;
    }
  ) {}
}

export class GetTransferByDocumentNumberQuery {
  constructor(
    public readonly documentNumber: string,
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET LIST
// ═══════════════════════════════════════════════════════════════

export class GetTransfersQuery {
  constructor(
    public readonly filters: {
      /** Исходящие перемещения от магазина */
      sourceShopId?: string;
      /** Входящие перемещения в магазин */
      targetShopId?: string;
      /** Статус */
      status?: TransferStatus;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// GET PENDING FOR SHOP
// ═══════════════════════════════════════════════════════════════

/**
 * Получить ожидающие приёма перемещения для магазина
 */
export class GetPendingTransfersForShopQuery {
  constructor(
    public readonly targetShopId: string,
  ) {}
}
