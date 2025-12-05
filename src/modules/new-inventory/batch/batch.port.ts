import { Batch } from './batch.schema';
import * as Commands from './batch.commands';
import * as Queries from './batch.queries';
import { BatchStatus } from './batch.enums';

/**
 * Статистика партий
 */
export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  expiredBatches: number;
  blockedBatches: number;
  depletedBatches: number;
  totalQuantity: number;
  expiringWithin7Days: number;
  expiringWithin3Days: number;
  averageFreshness: number;
}

/**
 * Порт модуля Batch
 */
export interface BatchPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать партию */
  create(command: Commands.CreateBatchCommand): Promise<Batch>;

  /** Обновить количество */
  updateQuantity(command: Commands.UpdateBatchQuantityCommand): Promise<Batch>;

  /** Обновить свежесть (авто) */
  updateFreshness(command: Commands.UpdateBatchFreshnessCommand): Promise<Batch>;

  /** Ручная корректировка свежести */
  adjustFreshnessManually(
    command: Commands.AdjustFreshnessManuallyCommand,
  ): Promise<Batch>;

  /** Изменить статус */
  updateStatus(command: Commands.UpdateBatchStatusCommand): Promise<Batch>;

  /** Переместить в другую локацию */
  moveToLocation(command: Commands.MoveBatchToLocationCommand): Promise<Batch>;

  /** Создать смешанную партию */
  createMixedBatch(command: Commands.CreateMixedBatchCommand): Promise<Batch>;

  /** Пометить как истёкшую */
  markExpired(command: Commands.MarkBatchExpiredCommand): Promise<Batch>;

  /** Пометить как израсходованную */
  markDepleted(command: Commands.MarkBatchDepletedCommand): Promise<Batch>;

  /** Заблокировать */
  block(command: Commands.BlockBatchCommand): Promise<Batch>;

  /** Разблокировать */
  unblock(command: Commands.UnblockBatchCommand): Promise<Batch>;

  /** Сгенерировать QR-код */
  generateQRCode(command: Commands.GenerateBatchQRCodeCommand): Promise<Batch>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetBatchByIdQuery): Promise<Batch | null>;

  /** Получить по QR-коду */
  getByQRCode(query: Queries.GetBatchByQRCodeQuery): Promise<Batch | null>;

  /** Получить по номеру */
  getByNumber(query: Queries.GetBatchByNumberQuery): Promise<Batch | null>;

  /** Получить партии товара */
  getByProduct(query: Queries.GetBatchesByProductQuery): Promise<Batch[]>;

  /** Получить партии в локации */
  getInLocation(query: Queries.GetBatchesInLocationQuery): Promise<Batch[]>;

  /** Получить истекающие партии */
  getExpiring(query: Queries.GetExpiringBatchesQuery): Promise<Batch[]>;

  /** Получить истёкшие для списания */
  getExpiredForWriteOff(
    query: Queries.GetExpiredBatchesForWriteOffQuery,
  ): Promise<Batch[]>;

  /** Получить для консолидации */
  getForConsolidation(
    query: Queries.GetBatchesForConsolidationQuery,
  ): Promise<Batch[]>;

  /** Получить смешанные партии */
  getMixedBatches(query: Queries.GetMixedBatchesQuery): Promise<Batch[]>;

  /** Поиск с фильтрами */
  search(
    query: Queries.SearchBatchesQuery,
  ): Promise<{ batches: Batch[]; total: number }>;

  /** Получить статистику */
  getStatistics(query: Queries.GetBatchStatisticsQuery): Promise<BatchStatistics>;
}

export const BATCH_PORT = Symbol('BATCH_PORT');
