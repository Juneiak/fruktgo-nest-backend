export type GetShopsFilters = {
  city?: string;
  sellerId?: string;

};

export class GetShopsQuery {
  constructor(
    public readonly filters?: GetShopsFilters,
  ) {}
}