import { VerifiedStatus, BlockStatus } from "src/common/enums/common.enum";
import { Seller } from "./seller.schema";

// application/seller.queries.ts
export class GetSellersQuery {
  constructor(
    public readonly filters?: {
    verifiedStatuses?: VerifiedStatus[];
    blockedStatuses?: BlockStatus[];
    },
    public readonly options?: {
      select?: (keyof Seller)[],
    },
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
    },
    public readonly options?: {
      select?: (keyof Seller)[]
    }
  ) {}
}
