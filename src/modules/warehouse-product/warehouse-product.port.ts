import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { WarehouseProduct } from './warehouse-product.schema';
import * as WarehouseProductCommands from './warehouse-product.commands';
import * as WarehouseProductQueries from './warehouse-product.queries';

export const WAREHOUSE_PRODUCT_PORT = Symbol('WAREHOUSE_PRODUCT_PORT');

export interface WarehouseProductPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  getWarehouseProduct(
    query: WarehouseProductQueries.GetWarehouseProductQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null>;

  getWarehouseProductsByIds(
    query: WarehouseProductQueries.GetWarehouseProductsByIdsQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct[]>;

  getWarehouseProducts(
    query: WarehouseProductQueries.GetWarehouseProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'stockQuantity'>,
  ): Promise<PaginateResult<WarehouseProduct>>;

  getWarehouseProductByProduct(
    query: WarehouseProductQueries.GetWarehouseProductByProductQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null>;

  getWarehouseProductByExternalCode(
    query: WarehouseProductQueries.GetWarehouseProductByExternalCodeQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct | null>;

  getLowStockWarehouseProducts(
    query: WarehouseProductQueries.GetLowStockWarehouseProductsQuery,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct[]>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  createWarehouseProduct(
    command: WarehouseProductCommands.CreateWarehouseProductCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  updateWarehouseProduct(
    command: WarehouseProductCommands.UpdateWarehouseProductCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  // Stock operations
  adjustStockQuantity(
    command: WarehouseProductCommands.AdjustStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  bulkAdjustStockQuantity(
    command: WarehouseProductCommands.BulkAdjustStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<void>;

  setStockQuantity(
    command: WarehouseProductCommands.SetStockQuantityCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  // Reserve operations
  reserveStock(
    command: WarehouseProductCommands.ReserveStockCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  releaseReserve(
    command: WarehouseProductCommands.ReleaseReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  confirmReserve(
    command: WarehouseProductCommands.ConfirmReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<WarehouseProduct>;

  // Bulk operations (для импорта)
  bulkUpsertWarehouseProducts(
    command: WarehouseProductCommands.BulkUpsertWarehouseProductsCommand,
    options?: CommonCommandOptions,
  ): Promise<{ created: number; updated: number }>;
}
