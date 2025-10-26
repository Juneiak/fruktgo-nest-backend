// application/seller.facade.ts
import { Injectable } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerPort } from './seller.port';
import { CreateSellerCommand, UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { Seller } from './seller.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class SellerFacade implements SellerPort {
  constructor(private readonly sellerService: SellerService) {}

  async getSeller(sellerId: string, options: CommonQueryOptions): Promise<Seller | null> {
    return this.sellerService.getSeller(sellerId, options);
  }

  async getSellers(options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Seller>> {
    return this.sellerService.getSellers(options);
  }

  async createSeller(command: CreateSellerCommand, options: CommonCommandOptions): Promise<Seller> {
    return this.sellerService.createSeller(command, options);
  }

  async updateSeller(command: UpdateSellerCommand, options: CommonCommandOptions): Promise<void> {
    return this.sellerService.updateSeller(command, options);
  }

  async blockSeller(command: BlockSellerCommand, options: CommonCommandOptions): Promise<void> {
    return this.sellerService.blockSeller(command, options);
  }
}