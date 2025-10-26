import { Shop } from './shop.schema';
import { PaginateResult } from 'mongoose';
import { CreateShopCommand, UpdateShopCommand, BlockShopCommand } from './shop.commands';
import { GetShopsQuery } from './shop.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface ShopPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getShop(shopId: string, options: CommonQueryOptions): Promise<Shop | null>;
  getShops(query: GetShopsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shop>>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createShop(command: CreateShopCommand, options: CommonCommandOptions): Promise<Shop>;
  updateShop(command: UpdateShopCommand, options: CommonCommandOptions): Promise<void>;
  blockShop(command: BlockShopCommand, options: CommonCommandOptions): Promise<void>;
}

export const SHOP_PORT = Symbol('SHOP_PORT');
