import { ProductCategory } from "./product.enums";

export type GetProductsFilters = {
  sellerId?: string;
  category?: ProductCategory;
};

export class GetProductsQuery {
  constructor(
    public readonly filters?: GetProductsFilters,
  ) {}
}