import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { WriteOff } from './write-off.schema';
import {
  CreateWriteOffCommand,
  UpdateWriteOffCommand,
  ConfirmWriteOffCommand,
  CancelWriteOffCommand,
} from './write-off.commands';
import {
  GetWriteOffQuery,
  GetWriteOffsQuery,
  GetWriteOffByNumberQuery,
} from './write-off.queries';

export const WRITE_OFF_PORT = Symbol('WRITE_OFF_PORT');

export interface WriteOffPort {
  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Получить документ списания по ID
   */
  getWriteOff(
    query: GetWriteOffQuery,
  ): Promise<WriteOff | null>;

  /**
   * Получить список документов списания
   */
  getWriteOffs(
    query: GetWriteOffsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<WriteOff>>;

  /**
   * Получить документ по номеру
   */
  getWriteOffByNumber(
    query: GetWriteOffByNumberQuery,
  ): Promise<WriteOff | null>;

  /**
   * Сгенерировать следующий номер документа
   */
  generateDocumentNumber(shopId: string): Promise<string>;

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Создать документ списания (черновик)
   */
  createWriteOff(
    command: CreateWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff>;

  /**
   * Обновить черновик
   */
  updateWriteOff(
    command: UpdateWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff>;

  /**
   * Подтвердить списание (меняет статус, НЕ списывает остатки - это делает оркестратор)
   */
  confirmWriteOff(
    command: ConfirmWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff>;

  /**
   * Отменить списание
   */
  cancelWriteOff(
    command: CancelWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<void>;
}
