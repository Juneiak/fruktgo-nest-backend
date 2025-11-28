import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateResult, Types } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';

import { ShopAccountPort } from './shop-account.port';
import * as Commands from './shop-account.commands';
import * as Queries from './shop-account.queries';

import { ShopAccount, AccountStatus } from './schemas/shop-account.schema';
import { 
  SettlementPeriod, 
  SettlementPeriodStatus, 
  SettlementPeriodAmounts 
} from './schemas/settlement-period.schema';
import { 
  SettlementPeriodTransaction, 
  SettlementPeriodTransactionDirection, 
  SettlementPeriodTransactionStatus, 
  SettlementPeriodTransactionType 
} from './schemas/settlement-period-transaction.schema';

/**
 * =====================================================
 * СЕРВИС SHOP ACCOUNT
 * =====================================================
 * 
 * Реализует ShopAccountPort для работы со счетами магазинов:
 * - ShopAccount — финансовый счёт магазина
 * - SettlementPeriod — расчётный период (14-21 день)
 * - SettlementPeriodTransaction — транзакции в периоде
 */
@Injectable()
export class ShopAccountService implements ShopAccountPort {
  
  constructor(
    @InjectModel(ShopAccount.name) private shopAccountModel: Model<ShopAccount>,
    @InjectModel(SettlementPeriod.name) private settlementPeriodModel: Model<SettlementPeriod>,
    @InjectModel(SettlementPeriodTransaction.name) private transactionModel: Model<SettlementPeriodTransaction>,
  ) {}
  
  // ====================================================
  // SHOP ACCOUNT — QUERIES
  // ====================================================
  
  async getShopAccount(query: Queries.GetShopAccountQuery): Promise<ShopAccount | null> {
    const { shopAccountId, shopId } = query.filter;
    
    if (shopAccountId) {
      checkId([shopAccountId]);
      return this.shopAccountModel.findById(shopAccountId).lean({ virtuals: true });
    }
    
    if (shopId) {
      checkId([shopId]);
      return this.shopAccountModel.findOne({ shop: new Types.ObjectId(shopId) }).lean({ virtuals: true });
    }
    
    return null;
  }
  
  // ====================================================
  // SHOP ACCOUNT — COMMANDS
  // ====================================================
  
  async createShopAccount(
    command: Commands.CreateShopAccountCommand,
    options?: CommonCommandOptions
  ): Promise<ShopAccount> {
    const { payload } = command;
    checkId([payload.shopId, payload.sellerAccountId]);
    
    // Проверяем, что у магазина ещё нет счёта
    const existing = await this.shopAccountModel.findOne({ 
      shop: new Types.ObjectId(payload.shopId) 
    });
    if (existing) {
      throw DomainError.conflict('У магазина уже есть финансовый счёт');
    }
    
    const shopAccount = new this.shopAccountModel({
      shop: new Types.ObjectId(payload.shopId),
      sellerAccount: new Types.ObjectId(payload.sellerAccountId),
      freezePeriodDays: payload.freezePeriodDays ?? 14,
      commissionPercent: payload.commissionPercent ?? 10,
      status: AccountStatus.ACTIVE,
    });
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await shopAccount.save(saveOptions);
    return shopAccount;
  }
  
  async updateShopAccount(
    command: Commands.UpdateShopAccountCommand,
    options?: CommonCommandOptions
  ): Promise<ShopAccount> {
    const { shopAccountId, payload } = command;
    checkId([shopAccountId]);
    
    const shopAccount = await this.shopAccountModel.findById(shopAccountId);
    if (!shopAccount) {
      throw DomainError.notFound('ShopAccount', shopAccountId);
    }
    
    if (payload.status !== undefined) shopAccount.status = payload.status;
    if (payload.freezePeriodDays !== undefined) shopAccount.freezePeriodDays = payload.freezePeriodDays;
    if (payload.commissionPercent !== undefined) shopAccount.commissionPercent = payload.commissionPercent;
    if (payload.internalComment !== undefined) shopAccount.internalComment = payload.internalComment;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await shopAccount.save(saveOptions);
    return shopAccount;
  }
  
  // ====================================================
  // SETTLEMENT PERIOD — QUERIES
  // ====================================================
  
  async getSettlementPeriod(query: Queries.GetSettlementPeriodQuery): Promise<SettlementPeriod | null> {
    checkId([query.settlementPeriodId]);
    return this.settlementPeriodModel.findById(query.settlementPeriodId).lean({ virtuals: true });
  }
  
  async getSettlementPeriods(query: Queries.GetSettlementPeriodsQuery): Promise<PaginateResult<SettlementPeriod>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    // Находим shopAccountId
    let shopAccountId: Types.ObjectId | null = null;
    
    if (filter.shopAccountId) {
      checkId([filter.shopAccountId]);
      shopAccountId = new Types.ObjectId(filter.shopAccountId);
    } else if (filter.shopId) {
      checkId([filter.shopId]);
      const shopAccount = await this.shopAccountModel.findOne({ 
        shop: new Types.ObjectId(filter.shopId) 
      }).select('_id');
      if (shopAccount) {
        shopAccountId = shopAccount._id;
      }
    }
    
    // Строим запрос
    const queryFilter: any = {};
    if (shopAccountId) queryFilter.shopAccount = shopAccountId;
    if (filter.status) queryFilter.status = filter.status;
    if (filter.fromDate) queryFilter.createdAt = { $gte: filter.fromDate };
    if (filter.toDate) queryFilter.createdAt = { ...queryFilter.createdAt, $lte: filter.toDate };
    
    const totalDocs = await this.settlementPeriodModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const skip = (page - 1) * pageSize;
    
    const docs = await this.settlementPeriodModel
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
  
  async getCurrentPeriod(query: Queries.GetCurrentPeriodQuery): Promise<SettlementPeriod | null> {
    checkId([query.shopAccountId]);
    return this.settlementPeriodModel.findOne({
      shopAccount: new Types.ObjectId(query.shopAccountId),
      status: SettlementPeriodStatus.ACTIVE,
    }).lean({ virtuals: true });
  }
  
  // ====================================================
  // SETTLEMENT PERIOD — COMMANDS
  // ====================================================
  
  async openSettlementPeriod(
    command: Commands.OpenSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod> {
    const { shopAccountId } = command;
    checkId([shopAccountId]);
    
    const shopAccount = await this.shopAccountModel.findById(shopAccountId);
    if (!shopAccount) {
      throw DomainError.notFound('ShopAccount', shopAccountId);
    }
    
    // Проверяем, что нет активного периода
    const hasActive = await this.settlementPeriodModel.exists({
      shopAccount: new Types.ObjectId(shopAccountId),
      status: SettlementPeriodStatus.ACTIVE,
    });
    if (hasActive) {
      throw DomainError.invariant('У магазина уже есть активный расчётный период');
    }
    
    // Получаем номер следующего периода
    const lastPeriod = await this.settlementPeriodModel
      .findOne({ shopAccount: new Types.ObjectId(shopAccountId) })
      .sort({ periodNumber: -1 })
      .select('periodNumber')
      .lean();
    
    const periodNumber = lastPeriod ? lastPeriod.periodNumber + 1 : 1;
    
    // Создаём период
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + shopAccount.freezePeriodDays);
    
    const period = new this.settlementPeriodModel({
      shopAccount: new Types.ObjectId(shopAccountId),
      periodNumber,
      startDate: now,
      endDate,
      status: SettlementPeriodStatus.ACTIVE,
      periodDurationDays: shopAccount.freezePeriodDays,
      amounts: {
        orderPayments: 0,
        orderCompletions: 0,
        refunds: 0,
        penalties: 0,
        commissions: 0,
        bonus: 0,
        correctionsIn: 0,
        correctionsOut: 0,
      },
    });
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await period.save(saveOptions);
    
    // Обновляем ссылку в ShopAccount
    shopAccount.currentSettlementPeriod = period._id;
    await shopAccount.save(saveOptions);
    
    return period;
  }
  
  async closeSettlementPeriod(
    command: Commands.CloseSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod> {
    const { settlementPeriodId } = command;
    checkId([settlementPeriodId]);
    
    const period = await this.settlementPeriodModel.findById(settlementPeriodId);
    if (!period) {
      throw DomainError.notFound('SettlementPeriod', settlementPeriodId);
    }
    
    if (period.status !== SettlementPeriodStatus.ACTIVE) {
      throw DomainError.invariant(`Нельзя закрыть период в статусе ${period.status}`);
    }
    
    // Получаем все завершённые транзакции
    const transactions = await this.transactionModel.find({
      settlementPeriod: period._id,
      status: SettlementPeriodTransactionStatus.COMPLETED,
    }).lean();
    
    // Подсчитываем суммы
    const amounts: SettlementPeriodAmounts = {
      orderPayments: 0,
      orderCompletions: 0,
      refunds: 0,
      penalties: 0,
      commissions: 0,
      bonus: 0,
      correctionsIn: 0,
      correctionsOut: 0,
    };
    
    let totalAmount = 0;
    
    for (const tx of transactions) {
      const multiplier = tx.direction === SettlementPeriodTransactionDirection.CREDIT ? 1 : -1;
      totalAmount += tx.amount * multiplier;
      
      switch (tx.type) {
        case SettlementPeriodTransactionType.ORDER_INCOME:
          amounts.orderCompletions += tx.amount;
          break;
        case SettlementPeriodTransactionType.ORDER_REFUND:
          amounts.refunds += tx.amount;
          break;
        case SettlementPeriodTransactionType.PENALTY:
          amounts.penalties += tx.amount;
          break;
        case SettlementPeriodTransactionType.COMMISSION:
          amounts.commissions += tx.amount;
          break;
        case SettlementPeriodTransactionType.BONUS:
          amounts.bonus += tx.amount;
          break;
        case SettlementPeriodTransactionType.CORRECTION_IN:
          amounts.correctionsIn += tx.amount;
          break;
        case SettlementPeriodTransactionType.CORRECTION_OUT:
          amounts.correctionsOut += tx.amount;
          break;
      }
    }
    
    // Обновляем период
    period.amounts = amounts;
    period.totalAmount = totalAmount;
    period.status = SettlementPeriodStatus.PENDING_APPROVAL;
    period.closedAt = new Date();
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await period.save(saveOptions);
    return period;
  }
  
  async approveSettlementPeriod(
    command: Commands.ApproveSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod> {
    const { settlementPeriodId, payload } = command;
    checkId([settlementPeriodId]);
    
    const period = await this.settlementPeriodModel.findById(settlementPeriodId);
    if (!period) {
      throw DomainError.notFound('SettlementPeriod', settlementPeriodId);
    }
    
    if (period.status !== SettlementPeriodStatus.PENDING_APPROVAL) {
      throw DomainError.invariant(`Нельзя одобрить период в статусе ${period.status}`);
    }
    
    // Обновляем период
    period.status = SettlementPeriodStatus.RELEASED;
    period.releasedAt = new Date();
    period.releasedAmount = period.totalAmount;
    if (payload?.internalComment) {
      period.internalComment = payload.internalComment;
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await period.save(saveOptions);
    return period;
  }
  
  async updateSettlementPeriod(
    command: Commands.UpdateSettlementPeriodCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriod> {
    const { settlementPeriodId, payload } = command;
    checkId([settlementPeriodId]);
    
    const period = await this.settlementPeriodModel.findById(settlementPeriodId);
    if (!period) {
      throw DomainError.notFound('SettlementPeriod', settlementPeriodId);
    }
    
    if (payload.internalComment !== undefined) {
      period.internalComment = payload.internalComment;
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await period.save(saveOptions);
    return period;
  }
  
  // ====================================================
  // TRANSACTION — QUERIES
  // ====================================================
  
  async getTransaction(query: Queries.GetTransactionQuery): Promise<SettlementPeriodTransaction | null> {
    checkId([query.transactionId]);
    return this.transactionModel.findById(query.transactionId).lean({ virtuals: true });
  }
  
  async getTransactions(query: Queries.GetTransactionsQuery): Promise<PaginateResult<SettlementPeriodTransaction>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    checkId([filter.settlementPeriodId]);
    
    const queryFilter: any = {
      settlementPeriod: new Types.ObjectId(filter.settlementPeriodId),
    };
    if (filter.type) queryFilter.type = filter.type;
    if (filter.status) queryFilter.status = filter.status;
    if (filter.fromDate) queryFilter.createdAt = { $gte: filter.fromDate };
    if (filter.toDate) queryFilter.createdAt = { ...queryFilter.createdAt, $lte: filter.toDate };
    
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
  // TRANSACTION — COMMANDS
  // ====================================================
  
  async createTransaction(
    command: Commands.CreateTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction> {
    const { payload } = command;
    
    // Находим период
    let period: SettlementPeriod | null = null;
    
    if (payload.settlementPeriodId) {
      checkId([payload.settlementPeriodId]);
      period = await this.settlementPeriodModel.findById(payload.settlementPeriodId);
      if (!period) {
        throw DomainError.notFound('SettlementPeriod', payload.settlementPeriodId);
      }
    } else if (payload.shopAccountId) {
      checkId([payload.shopAccountId]);
      period = await this.settlementPeriodModel.findOne({
        shopAccount: new Types.ObjectId(payload.shopAccountId),
        status: SettlementPeriodStatus.ACTIVE,
      });
      if (!period) {
        throw DomainError.invariant('У магазина нет активного расчётного периода');
      }
    } else {
      throw DomainError.validation('Необходимо указать shopAccountId или settlementPeriodId');
    }
    
    // Проверяем статус периода
    if (period.status === SettlementPeriodStatus.RELEASED) {
      throw DomainError.invariant('Нельзя создавать транзакции для завершённого периода');
    }
    
    // В период на утверждении можно только корректировки
    if (period.status === SettlementPeriodStatus.PENDING_APPROVAL) {
      const allowedTypes = [
        SettlementPeriodTransactionType.CORRECTION_IN,
        SettlementPeriodTransactionType.CORRECTION_OUT,
      ];
      if (!allowedTypes.includes(payload.type)) {
        throw DomainError.invariant('В периоде на утверждении можно создавать только корректировки');
      }
    }
    
    // Определяем направление
    const creditTypes = [
      SettlementPeriodTransactionType.ORDER_INCOME,
      SettlementPeriodTransactionType.BONUS,
      SettlementPeriodTransactionType.CORRECTION_IN,
    ];
    const direction = creditTypes.includes(payload.type)
      ? SettlementPeriodTransactionDirection.CREDIT
      : SettlementPeriodTransactionDirection.DEBIT;
    
    const transaction = new this.transactionModel({
      settlementPeriod: period._id,
      type: payload.type,
      status: payload.status ?? SettlementPeriodTransactionStatus.PENDING,
      direction,
      amount: Math.abs(payload.amount),
      description: payload.description,
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
    command: Commands.UpdateTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction> {
    const { transactionId, payload } = command;
    checkId([transactionId]);
    
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw DomainError.notFound('SettlementPeriodTransaction', transactionId);
    }
    
    if (payload.status !== undefined) transaction.status = payload.status;
    if (payload.description !== undefined) transaction.description = payload.description;
    if (payload.internalComment !== undefined) transaction.internalComment = payload.internalComment;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await transaction.save(saveOptions);
    return transaction;
  }
  
  async cancelTransaction(
    command: Commands.CancelTransactionCommand,
    options?: CommonCommandOptions
  ): Promise<SettlementPeriodTransaction> {
    const { transactionId, reason } = command;
    checkId([transactionId]);
    
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw DomainError.notFound('SettlementPeriodTransaction', transactionId);
    }
    
    if (transaction.status === SettlementPeriodTransactionStatus.CANCELED) {
      throw DomainError.invariant('Транзакция уже отменена');
    }
    
    if (transaction.status === SettlementPeriodTransactionStatus.COMPLETED) {
      throw DomainError.invariant('Нельзя отменить завершённую транзакцию');
    }
    
    transaction.status = SettlementPeriodTransactionStatus.CANCELED;
    if (reason) {
      transaction.internalComment = reason;
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await transaction.save(saveOptions);
    return transaction;
  }
}
