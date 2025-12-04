import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { ProductBatch } from './product-batch.schema';
import * as ProductBatchCommands from './product-batch.commands';
import * as ProductBatchQueries from './product-batch.queries';

export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  expiredBatches: number;
  blockedBatches: number;
  expiringWithin7Days: number;
  expiringWithin3Days: number;
  totalInitialQuantity: number;
  averageShelfLifeDays: number;
}

export interface ProductBatchPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  getProductBatch(
    query: ProductBatchQueries.GetProductBatchQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch | null>;

  getProductBatchByNumber(
    query: ProductBatchQueries.GetProductBatchByNumberQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch | null>;

  getProductBatches(
    query: ProductBatchQueries.GetProductBatchesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'expirationDate'>,
  ): Promise<PaginateResult<ProductBatch>>;

  /** Получить активные партии для товара (FIFO — сортировка по expirationDate ASC) */
  getActiveBatchesForProduct(
    query: ProductBatchQueries.GetActiveBatchesForProductQuery,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch[]>;

  /** Получить партии, истекающие в ближайшие N дней */
  getExpiringSoonBatches(
    query: ProductBatchQueries.GetExpiringSoonBatchesQuery,
    queryOptions?: CommonListQueryOptions<'expirationDate'>,
  ): Promise<PaginateResult<ProductBatch>>;

  /** Статистика по партиям */
  getBatchStatistics(
    query: ProductBatchQueries.GetBatchStatisticsQuery,
  ): Promise<BatchStatistics>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  createProductBatch(
    command: ProductBatchCommands.CreateProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch>;

  updateProductBatch(
    command: ProductBatchCommands.UpdateProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch>;

  updateProductBatchStatus(
    command: ProductBatchCommands.UpdateProductBatchStatusCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch>;

  blockProductBatch(
    command: ProductBatchCommands.BlockProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch>;

  unblockProductBatch(
    command: ProductBatchCommands.UnblockProductBatchCommand,
    options?: CommonCommandOptions,
  ): Promise<ProductBatch>;

  /** Пометить истёкшие партии (cron job) */
  expireProductBatches(
    command: ProductBatchCommands.ExpireProductBatchesCommand,
    options?: CommonCommandOptions,
  ): Promise<number>; // Количество помеченных
}

export const PRODUCT_BATCH_PORT = Symbol('PRODUCT_BATCH_PORT');
