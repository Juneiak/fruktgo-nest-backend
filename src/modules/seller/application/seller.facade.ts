// application/seller.facade.ts
import { Injectable } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerPort } from './seller.port';
import { FindSellerQuery, FindSellersQuery } from './seller.queries';
import { UpdateSellerCommand } from './seller.commands';
import { Seller } from '../seller.schema';
import { PaginateResult } from 'mongoose';

@Injectable()
export class SellerFacade implements SellerPort {
  constructor(private readonly sellerService: SellerService) {}

  async getSeller(id: string): Promise<Seller | null> {
    return this.sellerService.getSeller(new FindSellerQuery(id));
  }

  async getSellers(page: number, pageSize: number): Promise<PaginateResult<Seller>> {
    return this.sellerService.getSellers(new FindSellersQuery(page, pageSize));
  }

  async updateSeller(
    id: string,
    dto: { companyName?: string; inn?: string },
    logo?: Express.Multer.File,
  ): Promise<Seller | null> {
    return this.sellerService.updateSeller(
      new UpdateSellerCommand(id, dto.companyName, dto.inn, logo),
    );
  }
}