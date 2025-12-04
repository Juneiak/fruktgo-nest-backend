import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { BatchStock } from './batch-stock.schema';
import * as BatchStockCommands from './batch-stock.commands';
import * as BatchStockQueries from './batch-stock.queries';

export interface FifoConsumeResult {
  consumed: Array<{
    batchStockId: string;
    batchId: string;
    batchNumber: string;
    expirationDate: Date;
    quantity: number;
  }>;
  totalConsumed: number;
  remainingToConsume: number; // 0 если всё списано, > 0 если не хватило
}

export interface BatchStockPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  getBatchStock(
    query: BatchStockQueries.GetBatchStockQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock | null>;

  getBatchStocksByBatch(
    query: BatchStockQueries.GetBatchStocksByBatchQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]>;

  getBatchStocksByLocation(
    query: BatchStockQueries.GetBatchStocksByLocationQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<BatchStock>>;

  getBatchStocksByShopProduct(
    query: BatchStockQueries.GetBatchStocksByShopProductQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]>;

  getBatchStocksByWarehouseProduct(
    query: BatchStockQueries.GetBatchStocksByWarehouseProductQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]>;

  /** Получить партии для FIFO (отсортированные по expirationDate) */
  getBatchStocksForFifo(
    query: BatchStockQueries.GetBatchStocksForFifoQuery,
    options?: CommonCommandOptions,
  ): Promise<BatchStock[]>;

  /** Партии с истекающим сроком в локации */
  getExpiringBatchStocks(
    query: BatchStockQueries.GetExpiringBatchStocksQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<BatchStock>>;

  /** Общий остаток партии по всем локациям */
  getTotalStockByBatch(
    query: BatchStockQueries.GetTotalStockByBatchQuery,
  ): Promise<number>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  createBatchStock(
    command: BatchStockCommands.CreateBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;

  adjustBatchStock(
    command: BatchStockCommands.AdjustBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;

  reserveBatchStock(
    command: BatchStockCommands.ReserveBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;

  releaseBatchStockReserve(
    command: BatchStockCommands.ReleaseBatchStockReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;

  confirmBatchStockReserve(
    command: BatchStockCommands.ConfirmBatchStockReserveCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;

  /** Перемещение партии между локациями */
  transferBatchStock(
    command: BatchStockCommands.TransferBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<{ from: BatchStock; to: BatchStock }>;

  /** Списать по FIFO (автовыбор партий) */
  consumeFifo(
    command: BatchStockCommands.ConsumeFifoCommand,
    options?: CommonCommandOptions,
  ): Promise<FifoConsumeResult>;

  /** Списание конкретной партии */
  writeOffBatchStock(
    command: BatchStockCommands.WriteOffBatchStockCommand,
    options?: CommonCommandOptions,
  ): Promise<BatchStock>;
}

export const BATCH_STOCK_PORT = Symbol('BATCH_STOCK_PORT');
