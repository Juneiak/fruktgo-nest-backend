import { Movement } from './movement.schema';
import * as Commands from './movement.commands';
import * as Queries from './movement.queries';
import { MovementType } from './movement.enums';

/**
 * Сводка движений
 */
export interface MovementsSummary {
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  byType: Array<{
    type: MovementType;
    count: number;
    totalQuantity: number;
  }>;
}

/**
 * Порт модуля Movement
 */
export interface MovementPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Записать движение */
  record(command: Commands.RecordMovementCommand): Promise<Movement>;

  /** Записать несколько движений */
  bulkRecord(command: Commands.BulkRecordMovementsCommand): Promise<Movement[]>;

  /** Записать приёмку */
  recordReceiving(
    command: Commands.RecordReceivingMovementCommand,
  ): Promise<Movement>;

  /** Записать исходящее перемещение */
  recordTransferOut(
    command: Commands.RecordTransferOutMovementCommand,
  ): Promise<Movement>;

  /** Записать входящее перемещение */
  recordTransferIn(
    command: Commands.RecordTransferInMovementCommand,
  ): Promise<Movement>;

  /** Записать списание */
  recordWriteOff(
    command: Commands.RecordWriteOffMovementCommand,
  ): Promise<Movement>;

  /** Записать продажу */
  recordSale(command: Commands.RecordSaleMovementCommand): Promise<Movement>;

  /** Записать резервирование */
  recordReservation(
    command: Commands.RecordReservationMovementCommand,
  ): Promise<Movement>;

  /** Записать снятие резерва */
  recordReservationRelease(
    command: Commands.RecordReservationReleaseMovementCommand,
  ): Promise<Movement>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetMovementByIdQuery): Promise<Movement | null>;

  /** Получить по партии */
  getByBatch(
    query: Queries.GetMovementsByBatchQuery,
  ): Promise<{ items: Movement[]; total: number }>;

  /** Получить по продукту */
  getByProduct(
    query: Queries.GetMovementsByProductQuery,
  ): Promise<{ items: Movement[]; total: number }>;

  /** Получить для локации */
  getForLocation(
    query: Queries.GetMovementsForLocationQuery,
  ): Promise<{ items: Movement[]; total: number }>;

  /** Получить по документу */
  getByDocument(query: Queries.GetMovementsByDocumentQuery): Promise<Movement[]>;

  /** Получить по продавцу */
  getBySeller(
    query: Queries.GetMovementsBySellerQuery,
  ): Promise<{ items: Movement[]; total: number }>;

  /** Получить сводку */
  getSummary(query: Queries.GetMovementsSummaryQuery): Promise<MovementsSummary>;

  /** Поиск */
  search(
    query: Queries.SearchMovementsQuery,
  ): Promise<{ items: Movement[]; total: number }>;
}

export const MOVEMENT_PORT = Symbol('MOVEMENT_PORT');
