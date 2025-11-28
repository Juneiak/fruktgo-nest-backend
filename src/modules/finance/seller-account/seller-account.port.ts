import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { SellerAccount } from './schemas/seller-account.schema';
import { WithdrawalRequest } from './schemas/withdrawal-request.schema';

import * as Commands from './seller-account.commands';
import * as Queries from './seller-account.queries';

export const SELLER_ACCOUNT_PORT = Symbol('SELLER_ACCOUNT_PORT');

/**
 * =====================================================
 * ПОРТ SELLER ACCOUNT
 * =====================================================
 * 
 * Интерфейс для работы со счетами продавцов:
 * - SellerAccount — баланс продавца (сумма со всех магазинов)
 * - WithdrawalRequest — заявки на вывод средств
 */
export interface SellerAccountPort {
  
  // ====================================================
  // SELLER ACCOUNT — QUERIES
  // ====================================================
  
  /**
   * Получение счёта продавца
   */
  getSellerAccount(
    query: Queries.GetSellerAccountQuery
  ): Promise<SellerAccount | null>;
  
  // ====================================================
  // SELLER ACCOUNT — COMMANDS
  // ====================================================
  
  /**
   * Создание счёта продавца
   * Вызывается при регистрации нового продавца
   */
  createSellerAccount(
    command: Commands.CreateSellerAccountCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount>;
  
  /**
   * Обновление банковских реквизитов
   */
  updateBankDetails(
    command: Commands.UpdateBankDetailsCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount>;
  
  /**
   * Обновление статуса счёта
   */
  updateSellerAccountStatus(
    command: Commands.UpdateSellerAccountStatusCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount>;
  
  /**
   * Пополнение баланса
   * Вызывается при одобрении расчётного периода
   */
  addFunds(
    command: Commands.AddFundsCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount>;
  
  // ====================================================
  // WITHDRAWAL REQUEST — QUERIES
  // ====================================================
  
  /**
   * Получение заявки на вывод
   */
  getWithdrawalRequest(
    query: Queries.GetWithdrawalRequestQuery
  ): Promise<WithdrawalRequest | null>;
  
  /**
   * Получение списка заявок на вывод
   */
  getWithdrawalRequests(
    query: Queries.GetWithdrawalRequestsQuery
  ): Promise<PaginateResult<WithdrawalRequest>>;
  
  // ====================================================
  // WITHDRAWAL REQUEST — COMMANDS
  // ====================================================
  
  /**
   * Создание заявки на вывод
   */
  createWithdrawalRequest(
    command: Commands.CreateWithdrawalRequestCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest>;
  
  /**
   * Обновление заявки на вывод
   */
  updateWithdrawalRequest(
    command: Commands.UpdateWithdrawalRequestCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest>;
  
  /**
   * Одобрение заявки (списание средств)
   */
  approveWithdrawal(
    command: Commands.ApproveWithdrawalCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest>;
  
  /**
   * Отклонение заявки
   */
  rejectWithdrawal(
    command: Commands.RejectWithdrawalCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest>;
}
