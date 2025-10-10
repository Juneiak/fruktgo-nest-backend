import { ProductCategory } from "./product.enums";

export type GetProductsFilters = {
  category?: ProductCategory;
};

export class GetProductsQuery {
  constructor(
    public readonly sellerId: string,
    public readonly filters: GetProductsFilters,
  ) {}
}