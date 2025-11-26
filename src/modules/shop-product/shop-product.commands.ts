import { ShopProductStatus } from './shop-product.enums';

export class CreateShopProductCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      productId: string;
      shopId: string;
      stockQuantity?: number;
      status?: ShopProductStatus;
    }
  ) {}
}

export class UpdateShopProductCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      stockQuantity?: number;
      status?: ShopProductStatus;
    },
  ) {}
}

export class ArchiveShopProductCommand {
  constructor(
    public readonly shopProductId: string,
  ) {}
}

export class AddShopProductImageCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly shopProductImageFile: Express.Multer.File,
  ) {}
}

export class RemoveShopProductImageCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly shopProductImageId: string,
  ) {}
}

export class AdjustStockQuantityCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      adjustment: number; // positive to add, negative to subtract
    }
  ) {}
}

export class BulkAdjustStockQuantityCommand {
  constructor(
    public readonly items: Array<{
      shopProductId: string;
      adjustment: number;
    }>
  ) {}
}