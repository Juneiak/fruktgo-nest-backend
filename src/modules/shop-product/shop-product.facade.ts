import { Injectable } from '@nestjs/common';
import { ShopProductService } from './shop-product.service';
import { ShopProductPort } from './shop-product.port';
import { 
  CreateShopProductCommand,
  UpdateShopProductCommand, 
  ArchiveShopProductCommand,
  AddShopProductImageCommand,
  RemoveShopProductImageCommand 
} from './shop-product.commands';
import { GetShopProductQuery, GetShopProductsQuery } from './shop-product.queries';
import { ShopProduct } from './shop-product.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class ShopProductFacade implements ShopProductPort {
  constructor(private readonly shopProductService: ShopProductService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getShopProduct(query: GetShopProductQuery, options?: CommonQueryOptions): Promise<ShopProduct | null> {
    return this.shopProductService.getShopProduct(query, options);
  }

  async getShopProducts(query: GetShopProductsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<ShopProduct>> {
    return this.shopProductService.getShopProducts(query, options);
  }

  // ====================================================
  // COMMANDS
  // ====================================================
  async createShopProduct(command: CreateShopProductCommand, options: CommonCommandOptions): Promise<ShopProduct> {
    return this.shopProductService.createShopProduct(command, options);
  }

  async updateShopProduct(command: UpdateShopProductCommand, options: CommonCommandOptions): Promise<void> {
    return this.shopProductService.updateShopProduct(command, options);
  }

  async archiveShopProduct(command: ArchiveShopProductCommand, options: CommonCommandOptions): Promise<void> {
    return this.shopProductService.archiveShopProduct(command, options);
  }

  async addShopProductImage(command: AddShopProductImageCommand, options: CommonCommandOptions): Promise<string> {
    return this.shopProductService.addShopProductImage(command, options);
  }

  async removeShopProductImage(command: RemoveShopProductImageCommand, options: CommonCommandOptions): Promise<void> {
    return this.shopProductService.removeShopProductImage(command, options);
  }
}