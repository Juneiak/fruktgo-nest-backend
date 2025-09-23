// application/seller.port.ts
import { Seller } from '../seller.schema';
import { PaginateResult } from 'mongoose';

export interface SellerPort {
  getSeller(id: string): Promise<Seller | null>;
  getSellers(page: number, pageSize: number): Promise<PaginateResult<Seller>>;
  updateSeller(
    id: string,
    dto: { companyName?: string; inn?: string },
    logo?: Express.Multer.File,
  ): Promise<Seller | null>;
}