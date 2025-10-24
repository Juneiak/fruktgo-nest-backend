import { ShopProduct } from './shop-product.schema';
import { PaginateResult } from 'mongoose';
import { 
  CreateShopProductCommand,
  UpdateShopProductCommand, 
  ArchiveShopProductCommand,
  AddShopProductImageCommand,
  RemoveShopProductImageCommand 
} from './shop-product.commands';
import { GetShopProductQuery, GetShopProductsQuery } from './shop-product.queries';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface ShopProductPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getShopProduct(query: GetShopProductQuery, options?: CommonQueryOptions): Promise<ShopProduct | null>;
  getShopProducts(query: GetShopProductsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<ShopProduct>>;

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createShopProduct(command: CreateShopProductCommand, options: CommonCommandOptions): Promise<ShopProduct>;
  updateShopProduct(command: UpdateShopProductCommand, options: CommonCommandOptions): Promise<void>;
  archiveShopProduct(command: ArchiveShopProductCommand, options: CommonCommandOptions): Promise<void>;
  addShopProductImage(command: AddShopProductImageCommand, options: CommonCommandOptions): Promise<string>;
  removeShopProductImage(command: RemoveShopProductImageCommand, options: CommonCommandOptions): Promise<void>;
}

export const SHOP_PRODUCT_PORT = Symbol('SHOP_PRODUCT_PORT');
