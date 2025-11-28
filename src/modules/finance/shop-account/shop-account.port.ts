import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { ShopAccount } from './schemas/shop-account.schema';
import { SettlementPeriod } from './schemas/settlement-period.schema';
import { SettlementPeriodTransaction } from './schemas/settlement-period-transaction.schema';

import * as Commands from './shop-account.commands';
import * as Queries from './shop-account.queries';

export const SHOP_ACCOUNT_PORT = Symbol('SHOP_ACCOUNT_PORT');

/**
 * =====================================================
 * ПОРТ SHOP ACCOUNT
 * =====================================================
 * 
 * Интерфейс для работы со счетами магазинов:
 * - ShopAccount — финансовый счёт магазина
 * - SettlementPeriod — расчётный период (14-21 день)
 * - SettlementPeriodTransaction — транзакции в периоде
 */
export interface ShopAccountPort {
  
  // ====================================================
  // SHOP ACCOUNT — QUERIES
  // ====================================================
  
  /**
   * Получение счёта магазина
   */
  getShopAccount(
    query: Queries.GetShopAccountQuery
  ): Promise<ShopAccount | null>;
  
  // ====================================================
  // SHOP ACCOUNT — COMMANDS
  // ====================================================
  
  /**
   * Создание счёта магазина
   * Вызывается при создании нового магазина
   */
  createShopAccount(
    command: Commands.CreateShopAccountCommand,
    options?: CommonCommandOptions
  ): Promise<ShopAccount>;
  
  /**
   * Обновление настроек счёта
   */
  updateShopAccount(
    command: Commands.UpdateShopAccountCommand,
    options?: CommonCommandOptions
  ): Promise<ShopAccount>;
  
  // ====================================================
  // SETTLEMENT PERIOD — QUERIES
  // ====================================================
  
  /**
   * Получение периода по ID
   */
  getSettlementPeriod(
    query: Queries.GetSettlementPeriodQuery
  ): Promise<SettlementPeriod | null>;
  
  /**
   * Получение списка периодов магазина
   */
  getSettlementPeriods(
    query: Queries.GetSettlementPeriodsQuery
  ): Promise<PaginateResult<SettlementPeriod>>;
  
  /**
   * Получение текущего активного периода
   */
  getCurrentPeriod(
    query: Queries.GetCurrentPeriodQuery
  ): Promise<SettlementPeriod | null>;
  
  // ====================================================
  // SETTLEMENT PERIOD — COMMANDS
  // ====================================================
  
  /**
   * Открытие нового расчётного периода
   */
  openSettlementPeriod(
    command: Commands.OpenSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod>;
  
  /**
   * Закрытие периода (переход в PENDING_APPROVAL)
   */
  closeSettlementPeriod(
    command: Commands.CloseSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod>;
  
  /**
   * Одобрение периода (переход в RELEASED)
   * ВАЖНО: Не переводит деньги — это делает оркестратор
   */
  approveSettlementPeriod(
    command: Commands.ApproveSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod>;
  
  /**
   * Обновление комментария к периоду
   */
  updateSettlementPeriod(
    command: Commands.UpdateSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod>;
  
  // ====================================================
  // TRANSACTION — QUERIES
  // ====================================================
  
  /**
   * Получение транзакции по ID
   */
  getTransaction(
    query: Queries.GetTransactionQuery
  ): Promise<SettlementPeriodTransaction | null>;
  
  /**
   * Получение списка транзакций периода
   */
  getTransactions(
    query: Queries.GetTransactionsQuery
  ): Promise<PaginateResult<SettlementPeriodTransaction>>;
  
  // ====================================================
  // TRANSACTION — COMMANDS
  // ====================================================
  
  /**
   * Создание транзакции
   */
  createTransaction(
    command: Commands.CreateTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction>;
  
  /**
   * Обновление транзакции
   */
  updateTransaction(
    command: Commands.UpdateTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction>;
  
  /**
   * Отмена транзакции
   */
  cancelTransaction(
    command: Commands.CancelTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction>;
}
