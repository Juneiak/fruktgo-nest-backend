import { Transfer } from './transfer.schema';
import * as Commands from './transfer.commands';
import * as Queries from './transfer.queries';

/**
 * Результат отправки перемещения
 */
export interface SendTransferResult {
  transfer: Transfer;
  /** Позиции с пересчитанными сроками */
  recalculatedItems: Array<{
    itemIndex: number;
    newEffectiveExpiration: Date;
    newFreshnessRemaining: number;
  }>;
}

/**
 * Результат получения перемещения
 */
export interface ReceiveTransferResult {
  transfer: Transfer;
  /** Созданные/обновлённые BatchLocation */
  updatedBatchLocations: Array<{
    batchId: string;
    batchLocationId: string;
    quantity: number;
  }>;
}

/**
 * Порт модуля Transfer
 */
export interface TransferPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать перемещение */
  create(command: Commands.CreateTransferCommand): Promise<Transfer>;

  /** Добавить позицию */
  addItem(command: Commands.AddTransferItemCommand): Promise<Transfer>;

  /** Обновить позицию */
  updateItem(command: Commands.UpdateTransferItemCommand): Promise<Transfer>;

  /** Удалить позицию */
  removeItem(command: Commands.RemoveTransferItemCommand): Promise<Transfer>;

  /** Отправить */
  send(command: Commands.SendTransferCommand): Promise<SendTransferResult>;

  /** Получить */
  receive(command: Commands.ReceiveTransferCommand): Promise<ReceiveTransferResult>;

  /** Отменить */
  cancel(command: Commands.CancelTransferCommand): Promise<Transfer>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetTransferByIdQuery): Promise<Transfer | null>;

  /** Получить по номеру документа */
  getByDocumentNumber(
    query: Queries.GetTransferByDocumentNumberQuery,
  ): Promise<Transfer | null>;

  /** Получить перемещения продавца */
  getBySeller(
    query: Queries.GetTransfersBySellerQuery,
  ): Promise<{ items: Transfer[]; total: number }>;

  /** Получить для локации */
  getForLocation(
    query: Queries.GetTransfersForLocationQuery,
  ): Promise<{ items: Transfer[]; total: number }>;

  /** Получить ожидающие */
  getPending(query: Queries.GetPendingTransfersQuery): Promise<Transfer[]>;

  /** Поиск */
  search(
    query: Queries.SearchTransfersQuery,
  ): Promise<{ items: Transfer[]; total: number }>;

  /** Сгенерировать номер документа */
  generateDocumentNumber(sellerId: string): Promise<string>;
}

export const TRANSFER_PORT = Symbol('TRANSFER_PORT');
