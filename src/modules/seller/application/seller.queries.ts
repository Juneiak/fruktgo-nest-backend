// application/seller.queries.ts
export class GetSellerQuery {
  constructor(public readonly sellerId: string) {}
}

export class FindSellersQuery {
  constructor(
    public readonly page: number = 1,
    public readonly pageSize: number = 10,
  ) {}
}