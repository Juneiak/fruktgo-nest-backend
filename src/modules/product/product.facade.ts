import { Injectable } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductPort } from './product.port';
import { CreateProductCommand, UpdateProductCommand, DeleteProductCommand } from './product.commands';
import { Product } from './product.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';

@Injectable()
export class ProductFacade implements ProductPort {
  constructor(private readonly productService: ProductService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async createProduct(command: CreateProductCommand, options: CommonCommandOptions): Promise<Product> {
    return this.productService.createProduct(command, options);
  }

  async updateProduct(command: UpdateProductCommand, options: CommonCommandOptions): Promise<Product> {
    return this.productService.updateProduct(command, options);
  }

  async deleteProduct(productId: string, options: CommonCommandOptions): Promise<Product> {
    return this.productService.deleteProduct(productId, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getProducts(query: GetProductsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Product>> {
    return this.productService.getProducts(query, options);
  }

  async getProduct(productId: string, options: CommonQueryOptions): Promise<Product | null> {
    return this.productService.getProduct(productId, options);
  }
}