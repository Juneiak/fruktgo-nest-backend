import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { StockMovement } from './stock-movement.schema';
import {
  CreateStockMovementCommand,
  BulkCreateStockMovementsCommand,
} from './stock-movement.commands';
import {
  GetStockMovementQuery,
  GetStockMovementsQuery,
  GetMovementsByDocumentQuery,
} from './stock-movement.queries';

export const STOCK_MOVEMENT_PORT = Symbol('STOCK_MOVEMENT_PORT');

export interface StockMovementPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Получить запись движения по ID
   */
  getStockMovement(
    query: GetStockMovementQuery,
  ): Promise<StockMovement | null>;

  /**
   * Получить список движений с фильтрами и пагинацией
   */
  getStockMovements(
    query: GetStockMovementsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<StockMovement>>;

  /**
   * Получить все движения по документу (заказу, акту списания и т.д.)
   */
  getMovementsByDocument(
    query: GetMovementsByDocumentQuery,
  ): Promise<StockMovement[]>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Создать запись движения
   */
  createStockMovement(
    command: CreateStockMovementCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<StockMovement>;

  /**
   * Массовое создание записей движения
   */
  bulkCreateStockMovements(
    command: BulkCreateStockMovementsCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<StockMovement[]>;
}
