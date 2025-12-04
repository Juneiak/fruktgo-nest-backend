import { ShopProduct } from './shop-product.schema';
import { PaginateResult } from 'mongoose';
import { 
  CreateShopProductCommand,
  UpdateShopProductCommand, 
  ArchiveShopProductCommand,
  AddShopProductImageCommand,
  RemoveShopProductImageCommand,
  AdjustStockQuantityCommand,
  BulkAdjustStockQuantityCommand,
  BulkReserveStockCommand,
  BulkReleaseReserveCommand,
  BulkConfirmReserveCommand,
} from './shop-product.commands';
import { GetShopProductQuery, GetShopProductsQuery, GetShopProductsByIdsQuery } from './shop-product.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface ShopProductPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getShopProduct(query: GetShopProductQuery, queryOptions?: CommonQueryOptions): Promise<ShopProduct | null>;
  getShopProducts(query: GetShopProductsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<ShopProduct>>;
  getShopProductsByIds(query: GetShopProductsByIdsQuery, queryOptions?: CommonQueryOptions): Promise<ShopProduct[]>;

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createShopProduct(command: CreateShopProductCommand, commandOptions?: CommonCommandOptions): Promise<ShopProduct>;
  updateShopProduct(command: UpdateShopProductCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  archiveShopProduct(command: ArchiveShopProductCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  addShopProductImage(command: AddShopProductImageCommand, commandOptions?: CommonCommandOptions): Promise<string>;
  removeShopProductImage(command: RemoveShopProductImageCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  adjustStockQuantity(command: AdjustStockQuantityCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  bulkAdjustStockQuantity(command: BulkAdjustStockQuantityCommand, commandOptions?: CommonCommandOptions): Promise<void>;

  // ====================================================
  // RESERVE COMMANDS
  // ====================================================
  /** Резервирование товаров (увеличивает reservedQuantity) */
  bulkReserveStock(command: BulkReserveStockCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  
  /** Освобождение резерва (уменьшает reservedQuantity) */
  bulkReleaseReserve(command: BulkReleaseReserveCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  
  /** Подтверждение резерва (уменьшает reservedQuantity и stockQuantity) */
  bulkConfirmReserve(command: BulkConfirmReserveCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const SHOP_PRODUCT_PORT = Symbol('SHOP_PRODUCT_PORT');
