import { WriteOff } from './write-off.schema';
import * as Commands from './write-off.commands';
import * as Queries from './write-off.queries';
import { WriteOffReason } from '../../batch/batch.enums';

/**
 * Результат подтверждения списания
 */
export interface ConfirmWriteOffResult {
  writeOff: WriteOff;
  /** Списанные количества по партиям */
  writtenOffBatches: Array<{
    batchId: string;
    batchLocationId: string;
    quantity: number;
    remainingQuantity: number;
  }>;
  totalLoss: number;
}

/**
 * Статистика списаний
 */
export interface WriteOffStatistics {
  totalWriteOffs: number;
  totalQuantity: number;
  totalLoss: number;
  byReason: Array<{
    reason: WriteOffReason;
    count: number;
    quantity: number;
    loss: number;
  }>;
}

/**
 * Порт модуля WriteOff
 */
export interface WriteOffPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать списание */
  create(command: Commands.CreateWriteOffCommand): Promise<WriteOff>;

  /** Добавить позицию */
  addItem(command: Commands.AddWriteOffItemCommand): Promise<WriteOff>;

  /** Обновить позицию */
  updateItem(command: Commands.UpdateWriteOffItemCommand): Promise<WriteOff>;

  /** Удалить позицию */
  removeItem(command: Commands.RemoveWriteOffItemCommand): Promise<WriteOff>;

  /** Подтвердить списание */
  confirm(
    command: Commands.ConfirmWriteOffCommand,
  ): Promise<ConfirmWriteOffResult>;

  /** Отменить списание */
  cancel(command: Commands.CancelWriteOffCommand): Promise<WriteOff>;

  /** Создать автосписание истёкших */
  createAutoWriteOffForExpired(
    command: Commands.CreateAutoWriteOffForExpiredCommand,
  ): Promise<WriteOff | null>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetWriteOffByIdQuery): Promise<WriteOff | null>;

  /** Получить по номеру документа */
  getByDocumentNumber(
    query: Queries.GetWriteOffByDocumentNumberQuery,
  ): Promise<WriteOff | null>;

  /** Получить списания продавца */
  getBySeller(
    query: Queries.GetWriteOffsBySellerQuery,
  ): Promise<{ items: WriteOff[]; total: number }>;

  /** Получить для локации */
  getForLocation(
    query: Queries.GetWriteOffsForLocationQuery,
  ): Promise<{ items: WriteOff[]; total: number }>;

  /** Получить статистику */
  getStatistics(
    query: Queries.GetWriteOffStatisticsQuery,
  ): Promise<WriteOffStatistics>;

  /** Поиск */
  search(
    query: Queries.SearchWriteOffsQuery,
  ): Promise<{ items: WriteOff[]; total: number }>;

  /** Сгенерировать номер документа */
  generateDocumentNumber(sellerId: string): Promise<string>;
}

export const WRITE_OFF_PORT = Symbol('WRITE_OFF_PORT');
