import { Injectable } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopPort } from './shop.port';
import { CreateShopCommand, UpdateShopCommand, BlockShopCommand } from './shop.commands';
import { GetShopsQuery } from './shop.queries';
import { Shop } from './shop.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class ShopFacade implements ShopPort {
  constructor(private readonly shopService: ShopService) {}

  async getShop(shopId: string, options: CommonQueryOptions): Promise<Shop | null> {
    return this.shopService.getShop(shopId, options);
  }

  async getShops(query: GetShopsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Shop>> {
    return this.shopService.getShops(query, options);
  }

  async createShop(command: CreateShopCommand, options: CommonCommandOptions): Promise<Shop> {
    return this.shopService.createShop(command, options);
  }

  async updateShop(command: UpdateShopCommand, options: CommonCommandOptions): Promise<void> {
    return this.shopService.updateShop(command, options);
  }

  async blockShop(command: BlockShopCommand, options: CommonCommandOptions): Promise<void> {
    return this.shopService.blockShop(command, options);
  }
}