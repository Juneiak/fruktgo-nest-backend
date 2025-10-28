// application/seller.facade.ts
import { Injectable } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerPort } from './seller.port';
import { CreateSellerCommand, UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { Seller } from './seller.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetSellersQuery, GetSellerQuery } from './seller.queries';

@Injectable()
export class SellerFacade implements SellerPort {
  constructor(private readonly sellerService: SellerService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getSeller(
    query: GetSellerQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Seller | null> {
    return this.sellerService.getSeller(query, queryOptions);
  }

  async getSellers(
    query: GetSellersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Seller>> {
    return this.sellerService.getSellers(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createSeller(
    command: CreateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Seller> {
    return this.sellerService.createSeller(command, commandOptions);
  }

  async updateSeller(
    command: UpdateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.sellerService.updateSeller(command, commandOptions);
  }

  async blockSeller(
    command: BlockSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.sellerService.blockSeller(command, commandOptions);
  }
}