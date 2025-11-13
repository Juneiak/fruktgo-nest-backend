import { ShopStatus } from "./shop.enums";
import { Shop } from "./shop.schema";

export class GetShopsQuery {
  constructor(
    public readonly filters?: {
      city?: string;
      sellerId?: string;
      statuses?: ShopStatus[];
    },
    public readonly options?: {
      select?: (keyof Shop)[];
    },
  ) {}
}

export class GetShopQuery {
  constructor(
    public readonly filter?: {
      shopId?: string;
      shopAccountId?: string;
    },
    public readonly options?: {
      select?: (keyof Shop)[];
    },
    
  ) {}
}