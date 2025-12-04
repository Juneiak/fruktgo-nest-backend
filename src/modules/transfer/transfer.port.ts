import { PaginateResult } from 'mongoose';
import { Transfer } from './transfer.schema';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import {
  CreateTransferCommand,
  UpdateTransferCommand,
  SendTransferCommand,
  ReceiveTransferCommand,
  CancelTransferCommand,
} from './transfer.commands';
import {
  GetTransferQuery,
  GetTransferByDocumentNumberQuery,
  GetTransfersQuery,
  GetPendingTransfersForShopQuery,
} from './transfer.queries';

export interface TransferPort {
  // ====================================================
  // QUERIES
  // ====================================================
  
  getTransfer(
    query: GetTransferQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer | null>;

  getTransferByDocumentNumber(
    query: GetTransferByDocumentNumberQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer | null>;

  getTransfers(
    query: GetTransfersQuery, 
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Transfer>>;

  getPendingTransfersForShop(
    query: GetPendingTransfersForShopQuery, 
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer[]>;

  // ====================================================
  // COMMANDS
  // ====================================================

  /** Создать черновик перемещения */
  createTransfer(
    command: CreateTransferCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer>;

  /** Обновить черновик перемещения */
  updateTransfer(
    command: UpdateTransferCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer>;

  /** Отправить перемещение (DRAFT → SENT) */
  sendTransfer(
    command: SendTransferCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer>;

  /** Принять перемещение (SENT → RECEIVED) */
  receiveTransfer(
    command: ReceiveTransferCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer>;

  /** Отменить перемещение */
  cancelTransfer(
    command: CancelTransferCommand, 
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer>;
}

export const TRANSFER_PORT = Symbol('TRANSFER_PORT');
