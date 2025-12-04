// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

export class CreateTransferCommand {
  constructor(
    public readonly payload: {
      sourceShopId: string;
      targetShopId: string;
      items: Array<{
        shopProductId: string;
        quantity: number;
        comment?: string;
      }>;
      comment?: string;
      createdById: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// UPDATE (only DRAFT)
// ═══════════════════════════════════════════════════════════════

export class UpdateTransferCommand {
  constructor(
    public readonly transferId: string,
    public readonly payload: {
      items?: Array<{
        shopProductId: string;
        quantity: number;
        comment?: string;
      }>;
      comment?: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// SEND (DRAFT → SENT)
// ═══════════════════════════════════════════════════════════════

export class SendTransferCommand {
  constructor(
    public readonly transferId: string,
    public readonly payload: {
      sentById: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// RECEIVE (SENT → RECEIVED)
// ═══════════════════════════════════════════════════════════════

export class ReceiveTransferCommand {
  constructor(
    public readonly transferId: string,
    public readonly payload: {
      receivedById: string;
    }
  ) {}
}

// ═══════════════════════════════════════════════════════════════
// CANCEL
// ═══════════════════════════════════════════════════════════════

export class CancelTransferCommand {
  constructor(
    public readonly transferId: string,
    public readonly payload: {
      cancelledById: string;
      cancelReason?: string;
    }
  ) {}
}
