import { Product } from './product.schema';
import { PaginateResult } from 'mongoose';
import { CreateProductCommand, UpdateProductCommand } from './product.commands';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';

export interface ProductPort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createProduct(command: CreateProductCommand, options: CommonCommandOptions): Promise<Product>;
  updateProduct(command: UpdateProductCommand, options: CommonCommandOptions): Promise<Product>;
  deleteProduct(productId: string, options: CommonCommandOptions): Promise<Product>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getProducts(query: GetProductsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Product>>;
  getProduct(productId: string, options: CommonQueryOptions): Promise<Product | null>;
}

export const PRODUCT_PORT = Symbol('PRODUCT_PORT');