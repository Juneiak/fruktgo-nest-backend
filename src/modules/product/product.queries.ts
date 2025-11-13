import { ProductCategory } from "./product.enums";
import { Product } from "./product.schema";

export class GetProductsQuery {
  constructor(
    public readonly filters?: {
      sellerId?: string;
      category?: ProductCategory;
    },
    public readonly options?: {
      select?: (keyof Product)[],
    },
  ) {}
}

export class GetProductQuery {
  constructor(
    public readonly productId: string,
    public readonly options?: {
      select?: (keyof Product)[],
    },
  ) {}
}
