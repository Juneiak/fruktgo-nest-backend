import { Product } from './product.schema';
import { PaginateResult } from 'mongoose';
import { CreateProductCommand, UpdateProductCommand } from './product.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';

export interface ProductPort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getProducts(query: GetProductsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Product>>;
  getProduct(productId: string, queryOptions?: CommonQueryOptions): Promise<Product | null>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createProduct(command: CreateProductCommand, commandOptions?: CommonCommandOptions): Promise<Product>;
  updateProduct(command: UpdateProductCommand, commandOptions?: CommonCommandOptions): Promise<Product>;
  deleteProduct(productId: string, commandOptions?: CommonCommandOptions): Promise<Product>;
}

export const PRODUCT_PORT = Symbol('PRODUCT_PORT');