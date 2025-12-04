import { PaginateResult } from 'mongoose';
import { InventoryAudit } from './inventory-audit.schema';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import {
  CreateInventoryAuditCommand,
  StartInventoryAuditCommand,
  UpdateItemCountCommand,
  BulkUpdateItemCountsCommand,
  CompleteInventoryAuditCommand,
  CancelInventoryAuditCommand,
} from './inventory-audit.commands';
import {
  GetInventoryAuditQuery,
  GetInventoryAuditByDocumentNumberQuery,
  GetInventoryAuditsQuery,
  GetActiveInventoryAuditQuery,
} from './inventory-audit.queries';

export interface InventoryAuditPort {
  // ====================================================
  // QUERIES
  // ====================================================
  
  getInventoryAudit(
    query: GetInventoryAuditQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null>;

  getInventoryAuditByDocumentNumber(
    query: GetInventoryAuditByDocumentNumberQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null>;

  getInventoryAudits(
    query: GetInventoryAuditsQuery, 
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<InventoryAudit>>;

  getActiveInventoryAudit(
    query: GetActiveInventoryAuditQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null>;

  // ====================================================
  // COMMANDS
  // ====================================================

  /** Создать документ инвентаризации */
  createInventoryAudit(
    command: CreateInventoryAuditCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;

  /** Начать инвентаризацию (DRAFT → IN_PROGRESS) */
  startInventoryAudit(
    command: StartInventoryAuditCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;

  /** Обновить подсчёт по одной позиции */
  updateItemCount(
    command: UpdateItemCountCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;

  /** Массовое обновление подсчётов */
  bulkUpdateItemCounts(
    command: BulkUpdateItemCountsCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;

  /** Завершить инвентаризацию (IN_PROGRESS → COMPLETED) */
  completeInventoryAudit(
    command: CompleteInventoryAuditCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;

  /** Отменить инвентаризацию */
  cancelInventoryAudit(
    command: CancelInventoryAuditCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit>;
}

export const INVENTORY_AUDIT_PORT = Symbol('INVENTORY_AUDIT_PORT');
