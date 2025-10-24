export type GetShopProductQueryOptions = {
  populateImages?: boolean;
  populateProduct?: boolean;
};

export class GetShopProductQuery {
  constructor(
    public readonly shopProductId?: string,
    public readonly options?: GetShopProductQueryOptions,
  ) {}
}



export type GetShopProductsFilters = {
  shopId?: string;
};

export type GetShopProductsOptions = {
  populateImages?: boolean;
  populateProduct?: boolean;
  populateShop?: boolean;
};

export class GetShopProductsQuery {
  constructor(
    public readonly filters?: GetShopProductsFilters,
    public readonly options?: GetShopProductsOptions,
  ) {}
}


export class ShopProductsStockQuery {
  constructor(
    public readonly shopId: string,
    public readonly shopProductIds: string[],
  ) {}
};


