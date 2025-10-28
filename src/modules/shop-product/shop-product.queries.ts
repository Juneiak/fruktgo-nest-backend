import { ShopProductStatus } from "./shop-product.enums";

export class GetShopProductQuery {
  constructor(
    public readonly shopProductId: string,
    public readonly options?: {
      populateImages?: boolean;
      populateProduct?: boolean;
    },
  ) {}
}

export class GetShopProductsQuery {
  constructor(
    public readonly filters?: {
      productId?: string;
      shopId?: string;
      statuses?: ShopProductStatus[];
    },
    public readonly options?: {
      populateImages?: boolean;
      populateProduct?: boolean;
      populateShop?: boolean;
    },
  ) {}
}

export class GetShopProductsStockQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;
      shopProductIds?: string[];
    },
  ) {}
}


