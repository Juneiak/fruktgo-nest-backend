import { Seller } from './seller.schema';
import { PaginateResult } from 'mongoose';
import { UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface SellerPort {
  // ====================================================
  // QUERIES
  // ==================================================== 
  getSeller(sellerId: string, options: CommonQueryOptions): Promise<Seller | null>;
  getSellers(options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Seller>>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  updateSeller(command: UpdateSellerCommand, options: CommonCommandOptions): Promise<void>;
  blockSeller(command: BlockSellerCommand, options: CommonCommandOptions): Promise<void>;
}

export const SELLER_PORT = Symbol('SELLER_PORT');
