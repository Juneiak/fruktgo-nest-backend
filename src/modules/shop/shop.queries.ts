export class GetShopsQuery {
  constructor(
    public readonly filters?: {
      city?: string;
      sellerId?: string;
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