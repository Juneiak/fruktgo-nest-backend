import { Injectable, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DomainError } from 'src/common/errors';

import { SHOP_ACCOUNT_PORT, ShopAccountPort } from 'src/modules/finance/shop-account/shop-account.port';
import * as ShopAccountCommands from 'src/modules/finance/shop-account/shop-account.commands';
import * as ShopAccountQueries from 'src/modules/finance/shop-account/shop-account.queries';

import { SELLER_ACCOUNT_PORT, SellerAccountPort } from 'src/modules/finance/seller-account/seller-account.port';
import * as SellerAccountCommands from 'src/modules/finance/seller-account/seller-account.commands';
import * as SellerAccountQueries from 'src/modules/finance/seller-account/seller-account.queries';

import { PLATFORM_ACCOUNT_PORT, PlatformAccountPort } from 'src/modules/finance/platform-account/platform-account.port';
import * as PlatformAccountCommands from 'src/modules/finance/platform-account/platform-account.commands';

import { 
  SettlementPeriodTransactionType, 
  SettlementPeriodTransactionStatus 
} from 'src/modules/finance/shop-account/schemas/settlement-period-transaction.schema';
import { PlatformAccountTransactionType, PlatformAccountTransactionStatus } from 'src/modules/finance/platform-account/schemas/platform-account-transaction.schema';

import {
  ApproveSettlementPeriodResult,
  CloseSettlementPeriodResult,
  CreateWithdrawalResult,
  RecordOrderIncomeInput,
  ProcessRefundInput,
  ApplyPenaltyInput,
  ProcessOrderPaymentResult,
  ProcessRefundResult,
  ApplyPenaltyResult,
} from './finance-process.types';

export const FINANCE_PROCESS_ORCHESTRATOR = Symbol('FINANCE_PROCESS_ORCHESTRATOR');

/**
 * =====================================================
 * ОРКЕСТРАТОР ФИНАНСОВЫХ ПРОЦЕССОВ
 * =====================================================
 * 
 * Координирует сложные финансовые операции, которые затрагивают
 * несколько модулей и требуют транзакционности:
 * 
 * 1. Закрытие и одобрение расчётных периодов
 * 2. Перевод средств на счёт продавца
 * 3. Обработка выводов средств
 * 4. Запись дохода от заказа (с комиссией)
 * 5. Обработка возвратов
 * 6. Начисление штрафов
 */
@Injectable()
export class FinanceProcessOrchestrator {
  
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(SHOP_ACCOUNT_PORT) private readonly shopAccountPort: ShopAccountPort,
    @Inject(SELLER_ACCOUNT_PORT) private readonly sellerAccountPort: SellerAccountPort,
    @Inject(PLATFORM_ACCOUNT_PORT) private readonly platformAccountPort: PlatformAccountPort,
  ) {}
  
  /**
   * =====================================================
   * ЗАКРЫТИЕ РАСЧЁТНОГО ПЕРИОДА
   * =====================================================
   * 
   * Переводит период в статус PENDING_APPROVAL.
   * Подсчитывает итоговые суммы по транзакциям.
   * Автоматически открывает новый период.
   */
  async closeSettlementPeriod(settlementPeriodId: string): Promise<CloseSettlementPeriodResult> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Закрываем период
      const period = await this.shopAccountPort.closeSettlementPeriod(
        new ShopAccountCommands.CloseSettlementPeriodCommand(settlementPeriodId),
        { session }
      );
      
      // Открываем новый период
      await this.shopAccountPort.openSettlementPeriod(
        new ShopAccountCommands.OpenSettlementPeriodCommand(period.shopAccount.toString()),
        { session }
      );
      
      await session.commitTransaction();
      
      return {
        periodId: period._id.toString(),
        totalAmount: period.totalAmount,
        status: 'closed',
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * =====================================================
   * ОДОБРЕНИЕ РАСЧЁТНОГО ПЕРИОДА
   * =====================================================
   * 
   * 1. Переводит период в статус RELEASED
   * 2. Начисляет сумму на счёт продавца (SellerAccount)
   * 3. Создаёт транзакцию на счёте платформы
   */
  async approveSettlementPeriod(
    settlementPeriodId: string,
    comment?: string
  ): Promise<ApproveSettlementPeriodResult> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Получаем период
      const period = await this.shopAccountPort.getSettlementPeriod(
        new ShopAccountQueries.GetSettlementPeriodQuery(settlementPeriodId)
      );
      if (!period) {
        throw DomainError.notFound('SettlementPeriod', settlementPeriodId);
      }
      
      // Получаем счёт магазина
      const shopAccount = await this.shopAccountPort.getShopAccount(
        new ShopAccountQueries.GetShopAccountQuery({ shopAccountId: period.shopAccount.toString() })
      );
      if (!shopAccount) {
        throw DomainError.notFound('ShopAccount', period.shopAccount.toString());
      }
      
      // Одобряем период
      const approvedPeriod = await this.shopAccountPort.approveSettlementPeriod(
        new ShopAccountCommands.ApproveSettlementPeriodCommand(settlementPeriodId, { internalComment: comment }),
        { session }
      );
      
      // Начисляем деньги на счёт продавца
      const sellerAccount = await this.sellerAccountPort.addFunds(
        new SellerAccountCommands.AddFundsCommand(shopAccount.sellerAccount.toString(), {
          amount: approvedPeriod.releasedAmount,
          settlementPeriodId: settlementPeriodId,
        }),
        { session }
      );
      
      // Создаём транзакцию на счёте платформы (выплата продавцу)
      await this.platformAccountPort.createTransaction(
        new PlatformAccountCommands.CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.SELLER_PAYOUT,
          amount: approvedPeriod.releasedAmount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Выплата по периоду #${period.periodNumber}`,
          references: {
            sellerAccountId: sellerAccount._id.toString(),
            shopAccountId: shopAccount._id.toString(),
          },
        }),
        { session }
      );
      
      await session.commitTransaction();
      
      return {
        periodId: approvedPeriod._id.toString(),
        releasedAmount: approvedPeriod.releasedAmount,
        sellerAccountId: sellerAccount._id.toString(),
        newBalance: sellerAccount.balance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * =====================================================
   * СОЗДАНИЕ ЗАЯВКИ НА ВЫВОД СРЕДСТВ
   * =====================================================
   */
  async createWithdrawalRequest(
    sellerId: string,
    amount: number
  ): Promise<CreateWithdrawalResult> {
    const withdrawal = await this.sellerAccountPort.createWithdrawalRequest(
      new SellerAccountCommands.CreateWithdrawalRequestCommand(sellerId, { amount })
    );
    
    return {
      withdrawalRequestId: withdrawal._id.toString(),
      amount: withdrawal.amount,
      status: 'pending',
    };
  }
  
  /**
   * =====================================================
   * ОДОБРЕНИЕ ВЫВОДА СРЕДСТВ
   * =====================================================
   * 
   * 1. Списывает сумму с баланса продавца
   * 2. Создаёт транзакцию на счёте платформы
   */
  async approveWithdrawal(
    withdrawalRequestId: string,
    externalTransactionId?: string
  ): Promise<void> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Одобряем заявку (списание с баланса происходит внутри)
      const withdrawal = await this.sellerAccountPort.approveWithdrawal(
        new SellerAccountCommands.ApproveWithdrawalCommand(withdrawalRequestId, {
          externalTransactionId,
        }),
        { session }
      );
      
      // Создаём транзакцию на счёте платформы
      await this.platformAccountPort.createTransaction(
        new PlatformAccountCommands.CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.SELLER_PAYOUT,
          amount: withdrawal.amount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Вывод средств #${withdrawal._id}`,
          externalTransactionId,
          references: {
            withdrawalRequestId: withdrawal._id.toString(),
            sellerAccountId: withdrawal.sellerAccount.toString(),
          },
        }),
        { session }
      );
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * =====================================================
   * ЗАПИСЬ ДОХОДА ОТ ЗАКАЗА
   * =====================================================
   * 
   * Создаёт транзакции:
   * 1. ORDER_INCOME — доход продавца (за вычетом комиссии)
   * 2. COMMISSION — комиссия платформы
   * 3. COMMISSION_INCOME — доход платформы (на PlatformAccount)
   * 
   * Если commissionAmount не передан, рассчитывается из shopAccount.commissionPercent
   */
  async recordOrderIncome(input: RecordOrderIncomeInput): Promise<ProcessOrderPaymentResult> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Получаем счёт магазина
      const shopAccount = await this.shopAccountPort.getShopAccount(
        new ShopAccountQueries.GetShopAccountQuery({ shopAccountId: input.shopAccountId })
      );
      if (!shopAccount) {
        throw DomainError.notFound('ShopAccount', input.shopAccountId);
      }
      
      // Рассчитываем комиссию: если не передана — используем commissionPercent из ShopAccount
      const commissionAmount = input.commissionAmount ?? 
        Math.round(input.orderAmount * shopAccount.commissionPercent / 100);
      
      // Доход продавца = сумма заказа - комиссия
      const sellerIncome = input.orderAmount - commissionAmount;
      
      // Создаём транзакцию дохода продавца
      const incomeTransaction = await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: input.shopAccountId,
          type: SettlementPeriodTransactionType.ORDER_INCOME,
          amount: sellerIncome,
          status: SettlementPeriodTransactionStatus.COMPLETED,
          description: `Доход от заказа`,
          references: { orderId: input.orderId },
        }),
        { session }
      );
      
      // Создаём транзакцию комиссии (записывается как расход в периоде)
      await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: input.shopAccountId,
          type: SettlementPeriodTransactionType.COMMISSION,
          amount: commissionAmount,
          status: SettlementPeriodTransactionStatus.COMPLETED,
          description: `Комиссия платформы (${shopAccount.commissionPercent}%)`,
          references: { orderId: input.orderId },
        }),
        { session }
      );
      
      // Создаём транзакцию дохода платформы
      await this.platformAccountPort.createTransaction(
        new PlatformAccountCommands.CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.COMMISSION_INCOME,
          amount: commissionAmount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Комиссия с заказа (${shopAccount.commissionPercent}%)`,
          references: {
            orderId: input.orderId,
            shopAccountId: input.shopAccountId,
          },
        }),
        { session }
      );
      
      await session.commitTransaction();
      
      return {
        paymentId: input.orderId,
        transactionId: incomeTransaction._id.toString(),
        amount: input.orderAmount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * =====================================================
   * ОБРАБОТКА ВОЗВРАТА
   * =====================================================
   */
  async processRefund(input: ProcessRefundInput): Promise<ProcessRefundResult> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Создаём транзакцию возврата в периоде
      const refundTransaction = await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: input.shopAccountId,
          type: SettlementPeriodTransactionType.ORDER_REFUND,
          amount: input.refundAmount,
          status: SettlementPeriodTransactionStatus.COMPLETED,
          description: `Возврат: ${input.reason}`,
          references: { orderId: input.orderId },
        }),
        { session }
      );
      
      // Создаём транзакцию возврата на счёте платформы
      await this.platformAccountPort.createTransaction(
        new PlatformAccountCommands.CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.REFUND_TO_CUSTOMER,
          amount: input.refundAmount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Возврат клиенту: ${input.reason}`,
          references: {
            orderId: input.orderId,
            shopAccountId: input.shopAccountId,
          },
        }),
        { session }
      );
      
      await session.commitTransaction();
      
      return {
        refundId: refundTransaction._id.toString(),
        transactionId: refundTransaction._id.toString(),
        amount: input.refundAmount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  /**
   * =====================================================
   * НАЧИСЛЕНИЕ ШТРАФА
   * =====================================================
   */
  async applyPenalty(input: ApplyPenaltyInput): Promise<ApplyPenaltyResult> {
    const session = await this.connection.startSession();
    session.startTransaction();
    
    try {
      // Создаём транзакцию штрафа
      const penaltyTransaction = await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: input.shopAccountId,
          type: SettlementPeriodTransactionType.PENALTY,
          amount: input.amount,
          status: SettlementPeriodTransactionStatus.COMPLETED,
          description: input.description,
          references: { orderId: input.orderId },
        }),
        { session }
      );
      
      // Создаём транзакцию дохода платформы от штрафа
      await this.platformAccountPort.createTransaction(
        new PlatformAccountCommands.CreatePlatformTransactionCommand({
          type: PlatformAccountTransactionType.SELLER_PAYOUT_RETURN,
          amount: input.amount,
          status: PlatformAccountTransactionStatus.COMPLETED,
          description: `Штраф: ${input.reason}`,
          references: {
            penaltyId: penaltyTransaction._id.toString(),
            shopAccountId: input.shopAccountId,
          },
        }),
        { session }
      );
      
      await session.commitTransaction();
      
      return {
        penaltyId: penaltyTransaction._id.toString(),
        transactionId: penaltyTransaction._id.toString(),
        amount: input.amount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
