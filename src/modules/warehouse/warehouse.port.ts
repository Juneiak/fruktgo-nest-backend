import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { Warehouse } from './warehouse.schema';
import * as WarehouseCommands from './warehouse.commands';
import * as WarehouseQueries from './warehouse.queries';

export const WAREHOUSE_PORT = Symbol('WAREHOUSE_PORT');

export interface WarehousePort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Получить склад по ID
   */
  getWarehouse(
    query: WarehouseQueries.GetWarehouseQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse | null>;

  /**
   * Получить склад по внешнему коду (для импорта из 1С)
   */
  getWarehouseByExternalCode(
    query: WarehouseQueries.GetWarehouseByExternalCodeQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse | null>;

  /**
   * Получить список складов с фильтрацией и пагинацией
   */
  getWarehouses(
    query: WarehouseQueries.GetWarehousesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt' | 'name'>,
  ): Promise<PaginateResult<Warehouse>>;

  /**
   * Получить склады продавца
   */
  getWarehousesBySeller(
    query: WarehouseQueries.GetWarehousesBySellerQuery,
    options?: CommonCommandOptions,
  ): Promise<Warehouse[]>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать склад
   */
  createWarehouse(
    command: WarehouseCommands.CreateWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse>;

  /**
   * Обновить склад
   */
  updateWarehouse(
    command: WarehouseCommands.UpdateWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse>;

  /**
   * Изменить статус склада
   */
  updateWarehouseStatus(
    command: WarehouseCommands.UpdateWarehouseStatusCommand,
    options?: CommonCommandOptions,
  ): Promise<Warehouse>;

  /**
   * Удалить склад (soft delete через статус CLOSED)
   */
  deleteWarehouse(
    command: WarehouseCommands.DeleteWarehouseCommand,
    options?: CommonCommandOptions,
  ): Promise<void>;
}
