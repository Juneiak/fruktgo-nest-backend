import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { Receiving } from './receiving.schema';
import {
  CreateReceivingCommand,
  UpdateReceivingCommand,
  ConfirmReceivingCommand,
  CancelReceivingCommand,
} from './receiving.commands';
import {
  GetReceivingQuery,
  GetReceivingsQuery,
  GetReceivingByNumberQuery,
} from './receiving.queries';

export const RECEIVING_PORT = Symbol('RECEIVING_PORT');

export interface ReceivingPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Получить документ приёмки по ID
   */
  getReceiving(
    query: GetReceivingQuery,
  ): Promise<Receiving | null>;

  /**
   * Получить список документов приёмки
   */
  getReceivings(
    query: GetReceivingsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<Receiving>>;

  /**
   * Получить документ по номеру
   */
  getReceivingByNumber(
    query: GetReceivingByNumberQuery,
  ): Promise<Receiving | null>;

  /**
   * Сгенерировать следующий номер документа
   */
  generateDocumentNumber(shopId: string): Promise<string>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Создать документ приёмки (черновик)
   */
  createReceiving(
    command: CreateReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving>;

  /**
   * Обновить черновик
   */
  updateReceiving(
    command: UpdateReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving>;

  /**
   * Подтвердить приёмку (меняет статус, НЕ добавляет остатки - это делает оркестратор)
   */
  confirmReceiving(
    command: ConfirmReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving>;

  /**
   * Отменить приёмку
   */
  cancelReceiving(
    command: CancelReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<void>;
}
