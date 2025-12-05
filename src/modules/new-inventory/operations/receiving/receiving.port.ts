import { Receiving } from './receiving.schema';
import * as Commands from './receiving.commands';
import * as Queries from './receiving.queries';

/**
 * Результат подтверждения приёмки
 */
export interface ConfirmReceivingResult {
  receiving: Receiving;
  createdBatches: Array<{
    batchId: string;
    productId: string;
    quantity: number;
  }>;
}

/**
 * Порт модуля Receiving
 */
export interface ReceivingPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать приёмку */
  create(command: Commands.CreateReceivingCommand): Promise<Receiving>;

  /** Обновить черновик */
  update(command: Commands.UpdateReceivingCommand): Promise<Receiving>;

  /** Добавить позицию */
  addItem(command: Commands.AddReceivingItemCommand): Promise<Receiving>;

  /** Обновить позицию */
  updateItem(command: Commands.UpdateReceivingItemCommand): Promise<Receiving>;

  /** Удалить позицию */
  removeItem(command: Commands.RemoveReceivingItemCommand): Promise<Receiving>;

  /** Обновить фактическое количество */
  updateActualQuantity(
    command: Commands.UpdateActualQuantityCommand,
  ): Promise<Receiving>;

  /** Подтвердить приёмку */
  confirm(command: Commands.ConfirmReceivingCommand): Promise<ConfirmReceivingResult>;

  /** Отменить приёмку */
  cancel(command: Commands.CancelReceivingCommand): Promise<Receiving>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetReceivingByIdQuery): Promise<Receiving | null>;

  /** Получить по номеру документа */
  getByDocumentNumber(
    query: Queries.GetReceivingByDocumentNumberQuery,
  ): Promise<Receiving | null>;

  /** Получить приёмки продавца */
  getBySeller(
    query: Queries.GetReceivingsBySellerQuery,
  ): Promise<{ items: Receiving[]; total: number }>;

  /** Получить приёмки для локации */
  getForLocation(
    query: Queries.GetReceivingsForLocationQuery,
  ): Promise<{ items: Receiving[]; total: number }>;

  /** Поиск приёмок */
  search(
    query: Queries.SearchReceivingsQuery,
  ): Promise<{ items: Receiving[]; total: number }>;

  /** Получить черновики */
  getDrafts(query: Queries.GetDraftReceivingsQuery): Promise<Receiving[]>;

  /** Сгенерировать номер документа */
  generateDocumentNumber(sellerId: string): Promise<string>;
}

export const RECEIVING_PORT = Symbol('RECEIVING_PORT');
