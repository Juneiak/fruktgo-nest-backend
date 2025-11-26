export class GetCartQuery {
  constructor(
    public readonly customerId: string,
    public readonly options?: {
      populateProducts?: boolean;
      populateShop?: boolean;
    }
  ) {}
}

export class ValidateCartQuery {
  constructor(
    public readonly customerId: string,
  ) {}
}
