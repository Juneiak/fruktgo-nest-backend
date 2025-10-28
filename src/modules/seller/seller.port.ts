import { Seller } from './seller.schema';
import { PaginateResult } from 'mongoose';
import { CreateSellerCommand, UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetSellerQuery, GetSellersQuery } from './seller.queries';

export interface SellerPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getSeller(query: GetSellerQuery, queryOptions?: CommonQueryOptions): Promise<Seller | null>;
  getSellers(query: GetSellersQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Seller>>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createSeller(command: CreateSellerCommand, commandOptions?: CommonCommandOptions): Promise<Seller>;
  updateSeller(command: UpdateSellerCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  blockSeller(command: BlockSellerCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const SELLER_PORT = Symbol('SELLER_PORT');
