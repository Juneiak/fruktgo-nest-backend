import { Injectable } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductPort } from './product.port';
import { CreateProductCommand, UpdateProductCommand } from './product.commands';
import { Product } from './product.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';

@Injectable()
export class ProductFacade implements ProductPort {
  constructor(private readonly productService: ProductService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getProducts(
    query: GetProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Product>> {
    return this.productService.getProducts(query, queryOptions);
  }

  async getProduct(
    productId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Product | null> {
    return this.productService.getProduct(productId, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createProduct(
    command: CreateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    return this.productService.createProduct(command, commandOptions);
  }

  async updateProduct(
    command: UpdateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    return this.productService.updateProduct(command, commandOptions);
  }

  async deleteProduct(
    productId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    return this.productService.deleteProduct(productId, commandOptions);
  }
}