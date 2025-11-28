import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { PlatformAccount } from './schemas/platform-account.schema';
import { PlatformAccountTransaction } from './schemas/platform-account-transaction.schema';

import * as Commands from './platform-account.commands';
import * as Queries from './platform-account.queries';

export const PLATFORM_ACCOUNT_PORT = Symbol('PLATFORM_ACCOUNT_PORT');

/**
 * =====================================================
 * ПОРТ PLATFORM ACCOUNT
 * =====================================================
 * 
 * Интерфейс для работы со счётом платформы:
 * - PlatformAccount — единственный счёт с агрегатами
 * - PlatformAccountTransaction — транзакции платформы
 * 
 * Все изменения баланса происходят через транзакции.
 */
export interface PlatformAccountPort {
  
  // ====================================================
  // PLATFORM ACCOUNT — QUERIES
  // ====================================================
  
  /**
   * Получение счёта платформы
   */
  getPlatformAccount(
    query: Queries.GetPlatformAccountQuery
  ): Promise<PlatformAccount>;
  
  // ====================================================
  // TRANSACTION — QUERIES
  // ====================================================
  
  /**
   * Получение транзакции по ID
   */
  getTransaction(
    query: Queries.GetPlatformTransactionQuery
  ): Promise<PlatformAccountTransaction | null>;
  
  /**
   * Получение списка транзакций
   */
  getTransactions(
    query: Queries.GetPlatformTransactionsQuery
  ): Promise<PaginateResult<PlatformAccountTransaction>>;
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  /**
   * Создание транзакции
   */
  createTransaction(
    command: Commands.CreatePlatformTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccountTransaction>;
  
  /**
   * Обновление транзакции
   */
  updateTransaction(
    command: Commands.UpdatePlatformTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccountTransaction>;
  
  /**
   * Пересчёт агрегатов
   */
  recalculateAccount(
    command: Commands.RecalculatePlatformAccountCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccount>;
}
