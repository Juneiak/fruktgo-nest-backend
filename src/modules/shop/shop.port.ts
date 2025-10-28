import { Shop } from './shop.schema';
import { PaginateResult } from 'mongoose';
import { CreateShopCommand, UpdateShopCommand, BlockShopCommand } from './shop.commands';
import { GetShopsQuery, GetShopQuery } from './shop.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface ShopPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getShop(query: GetShopQuery, queryOptions?: CommonQueryOptions): Promise<Shop | null>;
  getShops(query: GetShopsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shop>>;

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createShop(command: CreateShopCommand, commandOptions?: CommonCommandOptions): Promise<Shop>;
  updateShop(command: UpdateShopCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  blockShop(command: BlockShopCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const SHOP_PORT = Symbol('SHOP_PORT');
