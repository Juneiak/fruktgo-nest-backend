import { Return } from './return.schema';
import * as Commands from './return.commands';
import * as Queries from './return.queries';
import { ReturnType, ReturnItemDecision } from './return.enums';

/**
 * Результат завершения возврата
 */
export interface CompleteReturnResult {
  return: Return;
  /** Позиции, возвращённые на полку */
  returnedToShelf: Array<{
    itemIndex: number;
    batchId: string;
    batchLocationId: string;
    quantity: number;
  }>;
  /** Позиции, списанные */
  writtenOff: Array<{
    itemIndex: number;
    batchId: string;
    writeOffId: string;
    quantity: number;
  }>;
  /** Общая сумма потерь */
  totalLoss: number;
  /** Общая сумма возвращённого */
  totalReturnedToShelf: number;
}

/**
 * Статистика возвратов
 */
export interface ReturnStatistics {
  totalReturns: number;
  totalQuantity: number;
  totalValue: number;
  totalLoss: number;
  byType: Array<{
    type: ReturnType;
    count: number;
    value: number;
    loss: number;
  }>;
  byDecision: Array<{
    decision: ReturnItemDecision;
    count: number;
    quantity: number;
    value: number;
  }>;
}

/**
 * Порт модуля Return
 */
export interface ReturnPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать возврат от клиента */
  createCustomerReturn(
    command: Commands.CreateCustomerReturnCommand,
  ): Promise<Return>;

  /** Создать возврат от курьера */
  createDeliveryReturn(
    command: Commands.CreateDeliveryReturnCommand,
  ): Promise<Return>;

  /** Создать возврат поставщику */
  createSupplierReturn(
    command: Commands.CreateSupplierReturnCommand,
  ): Promise<Return>;

  /** Осмотреть позицию */
  inspectItem(command: Commands.InspectReturnItemCommand): Promise<Return>;

  /** Завершить осмотр */
  completeInspection(
    command: Commands.CompleteInspectionCommand,
  ): Promise<Return>;

  /** Завершить возврат */
  complete(command: Commands.CompleteReturnCommand): Promise<CompleteReturnResult>;

  /** Отклонить возврат поставщику */
  rejectSupplierReturn(
    command: Commands.RejectSupplierReturnCommand,
  ): Promise<Return>;

  /** Подтвердить возврат поставщику */
  approveSupplierReturn(
    command: Commands.ApproveSupplierReturnCommand,
  ): Promise<Return>;

  /** Отменить */
  cancel(command: Commands.CancelReturnCommand): Promise<Return>;

  /** Добавить фото */
  addPhotos(command: Commands.AddReturnPhotosCommand): Promise<Return>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetReturnByIdQuery): Promise<Return | null>;

  /** Получить по номеру документа */
  getByDocumentNumber(
    query: Queries.GetReturnByDocumentNumberQuery,
  ): Promise<Return | null>;

  /** Получить по заказу */
  getByOrder(query: Queries.GetReturnByOrderQuery): Promise<Return[]>;

  /** Получить возвраты продавца */
  getBySeller(
    query: Queries.GetReturnsBySellerQuery,
  ): Promise<{ items: Return[]; total: number }>;

  /** Получить для локации */
  getForLocation(
    query: Queries.GetReturnsForLocationQuery,
  ): Promise<{ items: Return[]; total: number }>;

  /** Получить ожидающие осмотра */
  getPendingInspection(
    query: Queries.GetPendingInspectionReturnsQuery,
  ): Promise<Return[]>;

  /** Получить статистику */
  getStatistics(query: Queries.GetReturnStatisticsQuery): Promise<ReturnStatistics>;

  /** Поиск */
  search(
    query: Queries.SearchReturnsQuery,
  ): Promise<{ items: Return[]; total: number }>;

  /** Сгенерировать номер документа */
  generateDocumentNumber(sellerId: string, type: ReturnType): Promise<string>;
}

export const RETURN_PORT = Symbol('RETURN_PORT');
