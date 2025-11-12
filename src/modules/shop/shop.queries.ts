import { ShopStatus } from "./shop.enums";

export class GetShopsQuery {
  constructor(
    public readonly filters?: {
      city?: string;
      sellerId?: string;
      statuses?: ShopStatus[];
    },
  ) {}
}

export class GetShopQuery {
  constructor(
    public readonly filter?: {
      shopId?: string;
      shopAccountId?: string;
    },
  ) {}
}