import { VerifiedStatus, BlockStatus } from "src/common/enums/common.enum";

// application/seller.queries.ts
export class GetSellersQuery {
  constructor(
    public readonly filters?: {
    verifiedStatuses?: VerifiedStatus[];
    blockedStatuses?: BlockStatus[];
    
    }
  ) {}
}

export class GetSellerQuery {
  constructor(
    public readonly filter?: {
      sellerId?: string,
      telegramId?: number,
      accountId?: string,
      phone?: string,
      inn?: string,
    }
  ) {}
}
