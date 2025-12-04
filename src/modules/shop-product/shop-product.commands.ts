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

/**
 * Резервирование товара (при создании заказа до оплаты)
 */
export class ReserveStockCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      quantity: number;
    }
  ) {}
}

/**
 * Массовое резервирование
 */
export class BulkReserveStockCommand {
  constructor(
    public readonly items: Array<{
      shopProductId: string;
      quantity: number;
    }>
  ) {}
}

/**
 * Освобождение резерва (отмена заказа, истечение времени)
 */
export class ReleaseReserveCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      quantity: number;
    }
  ) {}
}

/**
 * Массовое освобождение резерва
 */
export class BulkReleaseReserveCommand {
  constructor(
    public readonly items: Array<{
      shopProductId: string;
      quantity: number;
    }>
  ) {}
}

/**
 * Подтверждение резерва (оплата прошла, списываем из stockQuantity)
 */
export class ConfirmReserveCommand {
  constructor(
    public readonly shopProductId: string,
    public readonly payload: {
      quantity: number;
    }
  ) {}
}

/**
 * Массовое подтверждение резерва
 */
export class BulkConfirmReserveCommand {
  constructor(
    public readonly items: Array<{
      shopProductId: string;
      quantity: number;
    }>
  ) {}
}