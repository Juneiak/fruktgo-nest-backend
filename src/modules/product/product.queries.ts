import { ProductCategory } from "./product.enums";

export class GetProductsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;
      category?: ProductCategory;
    },
  ) {}
}