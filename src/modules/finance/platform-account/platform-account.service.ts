import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateResult, Types } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';

import { PlatformAccountPort } from './platform-account.port';
import * as Commands from './platform-account.commands';
import * as Queries from './platform-account.queries';

import { PlatformAccount } from './schemas/platform-account.schema';
import { 
  PlatformAccountTransaction, 
  PlatformAccountTransactionDirection, 
  PlatformAccountTransactionStatus, 
  PlatformAccountTransactionType 
} from './schemas/platform-account-transaction.schema';

/**
 * =====================================================
 * СЕРВИС PLATFORM ACCOUNT
 * =====================================================
 * 
 * Реализует PlatformAccountPort для работы со счётом платформы:
 * - PlatformAccount — единственный счёт с агрегатами
 * - PlatformAccountTransaction — транзакции платформы
 */
@Injectable()
export class PlatformAccountService implements PlatformAccountPort {
  
  constructor(
    @InjectModel(PlatformAccount.name) private platformAccountModel: Model<PlatformAccount>,
    @InjectModel(PlatformAccountTransaction.name) private transactionModel: Model<PlatformAccountTransaction>,
  ) {}
  
  // ====================================================
  // PLATFORM ACCOUNT — QUERIES
  // ====================================================
  
  async getPlatformAccount(query: Queries.GetPlatformAccountQuery): Promise<PlatformAccount> {
    const account = await this.platformAccountModel.findOne().lean({ virtuals: true });
    if (!account) {
      throw DomainError.notFound('PlatformAccount', 'единственный');
    }
    return account;
  }
  
  // ====================================================
  // TRANSACTION — QUERIES
  // ====================================================
  
  async getTransaction(query: Queries.GetPlatformTransactionQuery): Promise<PlatformAccountTransaction | null> {
    checkId([query.transactionId]);
    return this.transactionModel.findById(query.transactionId).lean({ virtuals: true });
  }
  
  async getTransactions(query: Queries.GetPlatformTransactionsQuery): Promise<PaginateResult<PlatformAccountTransaction>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    const queryFilter: any = {};
    if (filter?.type) queryFilter.type = filter.type;
    if (filter?.status) queryFilter.status = filter.status;
    if (filter?.fromDate) queryFilter.createdAt = { $gte: filter.fromDate };
    if (filter?.toDate) queryFilter.createdAt = { ...queryFilter.createdAt, $lte: filter.toDate };
    
    const totalDocs = await this.transactionModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const skip = (page - 1) * pageSize;
    
    const docs = await this.transactionModel
      .find(queryFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true });
    
    return {
      docs,
      totalDocs,
      limit: pageSize,
      page,
      totalPages,
      offset: skip,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      pagingCounter: skip + 1,
    };
  }
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  async createTransaction(
    command: Commands.CreatePlatformTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccountTransaction> {
    const { payload } = command;
    
    const platformAccount = await this.platformAccountModel.findOne();
    if (!platformAccount) {
      throw DomainError.notFound('PlatformAccount', 'единственный');
    }
    
    // Определяем направление на основе типа транзакции
    const debitTypes = [
      PlatformAccountTransactionType.SELLER_PAYOUT,
      PlatformAccountTransactionType.DELIVERY_PAYMENT,
      PlatformAccountTransactionType.REFUND_TO_CUSTOMER,
      PlatformAccountTransactionType.BONUS_TO_SELLER,
      PlatformAccountTransactionType.OPERATIONAL_EXPENSE,
      PlatformAccountTransactionType.CORRECTION_OUT,
    ];
    
    const direction = debitTypes.includes(payload.type)
      ? PlatformAccountTransactionDirection.DEBIT
      : PlatformAccountTransactionDirection.CREDIT;
    
    const transaction = new this.transactionModel({
      platformAccount: platformAccount._id,
      type: payload.type,
      direction,
      status: payload.status ?? PlatformAccountTransactionStatus.PENDING,
      amount: Math.abs(payload.amount),
      description: payload.description,
      isManual: payload.isManual ?? false,
      internalComment: payload.internalComment,
      externalTransactionId: payload.externalTransactionId,
      references: payload.references ?? {},
    });
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await transaction.save(saveOptions);
    return transaction;
  }
  
  async updateTransaction(
    command: Commands.UpdatePlatformTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccountTransaction> {
    const { transactionId, payload } = command;
    checkId([transactionId]);
    
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw DomainError.notFound('PlatformAccountTransaction', transactionId);
    }
    
    if (payload.status !== undefined) transaction.status = payload.status;
    if (payload.description !== undefined) transaction.description = payload.description;
    if (payload.internalComment !== undefined) transaction.internalComment = payload.internalComment;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await transaction.save(saveOptions);
    return transaction;
  }
  
  async recalculateAccount(
    command: Commands.RecalculatePlatformAccountCommand,
    options?: CommonCommandOptions
  ): Promise<PlatformAccount> {
    const platformAccount = await this.platformAccountModel.findOne();
    if (!platformAccount) {
      throw DomainError.notFound('PlatformAccount', 'единственный');
    }
    
    // Получаем все завершённые транзакции
    const transactions = await this.transactionModel.find({
      status: PlatformAccountTransactionStatus.COMPLETED,
    }).lean();
    
    // Пересчитываем агрегаты
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalPlatformCommissions = 0;
    let totalPenaltyIncome = 0;
    let totalPayoutsToSellers = 0;
    let totalRefundsToCustomers = 0;
    let deliveryPayouts = 0;
    let totalBonusesIssued = 0;
    
    for (const tx of transactions) {
      if (tx.direction === PlatformAccountTransactionDirection.CREDIT) {
        totalInflow += tx.amount;
      } else {
        totalOutflow += tx.amount;
      }
      
      switch (tx.type) {
        case PlatformAccountTransactionType.COMMISSION_INCOME:
          totalPlatformCommissions += tx.amount;
          break;
        case PlatformAccountTransactionType.SELLER_PAYOUT_RETURN:
          totalPenaltyIncome += tx.amount;
          break;
        case PlatformAccountTransactionType.SELLER_PAYOUT:
          totalPayoutsToSellers += tx.amount;
          break;
        case PlatformAccountTransactionType.REFUND_TO_CUSTOMER:
          totalRefundsToCustomers += tx.amount;
          break;
        case PlatformAccountTransactionType.DELIVERY_PAYMENT:
          deliveryPayouts += tx.amount;
          break;
        case PlatformAccountTransactionType.BONUS_TO_SELLER:
          totalBonusesIssued += tx.amount;
          break;
      }
    }
    
    // Обновляем счёт платформы
    platformAccount.totalInflow = totalInflow;
    platformAccount.totalOutflow = totalOutflow;
    platformAccount.currentBalance = totalInflow - totalOutflow;
    platformAccount.totalPlatformCommissions = totalPlatformCommissions;
    platformAccount.totalPenaltyIncome = totalPenaltyIncome;
    platformAccount.totalPayoutsToSellers = totalPayoutsToSellers;
    platformAccount.totalRefundsToCustomers = totalRefundsToCustomers;
    platformAccount.deliveryPayouts = deliveryPayouts;
    platformAccount.totalBonusesIssued = totalBonusesIssued;
    platformAccount.platformEarnings = totalPlatformCommissions + totalPenaltyIncome;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await platformAccount.save(saveOptions);
    return platformAccount;
  }
}
