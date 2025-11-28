import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PaginateResult, Types } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';

import { SellerAccountPort } from './seller-account.port';
import * as Commands from './seller-account.commands';
import * as Queries from './seller-account.queries';

import { SellerAccount, SellerAccountStatus } from './schemas/seller-account.schema';
import { WithdrawalRequest, WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';

/**
 * =====================================================
 * СЕРВИС SELLER ACCOUNT
 * =====================================================
 * 
 * Реализует SellerAccountPort для работы со счетами продавцов:
 * - SellerAccount — баланс продавца (сумма со всех магазинов)
 * - WithdrawalRequest — заявки на вывод средств
 */
@Injectable()
export class SellerAccountService implements SellerAccountPort {
  
  constructor(
    @InjectModel(SellerAccount.name) private sellerAccountModel: Model<SellerAccount>,
    @InjectModel(WithdrawalRequest.name) private withdrawalModel: Model<WithdrawalRequest>,
  ) {}
  
  // ====================================================
  // SELLER ACCOUNT — QUERIES
  // ====================================================
  
  async getSellerAccount(query: Queries.GetSellerAccountQuery): Promise<SellerAccount | null> {
    const { sellerAccountId, sellerId } = query.filter;
    
    if (sellerAccountId) {
      checkId([sellerAccountId]);
      return this.sellerAccountModel.findById(sellerAccountId).lean({ virtuals: true });
    }
    
    if (sellerId) {
      checkId([sellerId]);
      return this.sellerAccountModel.findOne({ seller: new Types.ObjectId(sellerId) }).lean({ virtuals: true });
    }
    
    return null;
  }
  
  // ====================================================
  // SELLER ACCOUNT — COMMANDS
  // ====================================================
  
  async createSellerAccount(
    command: Commands.CreateSellerAccountCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount> {
    const { sellerId } = command;
    checkId([sellerId]);
    
    // Проверяем, что у продавца ещё нет счёта
    const existing = await this.sellerAccountModel.findOne({ 
      seller: new Types.ObjectId(sellerId) 
    });
    if (existing) {
      throw DomainError.conflict('У продавца уже есть финансовый счёт');
    }
    
    const account = new this.sellerAccountModel({
      seller: new Types.ObjectId(sellerId),
      balance: 0,
      totalWithdrawnAmount: 0,
      status: SellerAccountStatus.ACTIVE,
      bankDetails: {},
    });
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await account.save(saveOptions);
    return account;
  }
  
  async updateBankDetails(
    command: Commands.UpdateBankDetailsCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount> {
    const { sellerAccountId, payload } = command;
    checkId([sellerAccountId]);
    
    const account = await this.sellerAccountModel.findById(sellerAccountId);
    if (!account) {
      throw DomainError.notFound('SellerAccount', sellerAccountId);
    }
    
    // Обновляем только переданные поля
    account.bankDetails = {
      ...account.bankDetails,
      ...payload,
    };
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await account.save(saveOptions);
    return account;
  }
  
  async updateSellerAccountStatus(
    command: Commands.UpdateSellerAccountStatusCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount> {
    const { sellerAccountId, payload } = command;
    checkId([sellerAccountId]);
    
    const account = await this.sellerAccountModel.findById(sellerAccountId);
    if (!account) {
      throw DomainError.notFound('SellerAccount', sellerAccountId);
    }
    
    account.status = payload.status;
    if (payload.statusReason !== undefined) {
      account.statusReason = payload.statusReason;
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await account.save(saveOptions);
    return account;
  }
  
  async addFunds(
    command: Commands.AddFundsCommand,
    options?: CommonCommandOptions
  ): Promise<SellerAccount> {
    const { sellerAccountId, payload } = command;
    checkId([sellerAccountId]);
    
    const account = await this.sellerAccountModel.findById(sellerAccountId);
    if (!account) {
      throw DomainError.notFound('SellerAccount', sellerAccountId);
    }
    
    if (account.status !== SellerAccountStatus.ACTIVE) {
      throw DomainError.invariant('Нельзя пополнить заблокированный счёт');
    }
    
    account.balance += payload.amount;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await account.save(saveOptions);
    return account;
  }
  
  // ====================================================
  // WITHDRAWAL REQUEST — QUERIES
  // ====================================================
  
  async getWithdrawalRequest(query: Queries.GetWithdrawalRequestQuery): Promise<WithdrawalRequest | null> {
    checkId([query.withdrawalRequestId]);
    return this.withdrawalModel.findById(query.withdrawalRequestId).lean({ virtuals: true });
  }
  
  async getWithdrawalRequests(query: Queries.GetWithdrawalRequestsQuery): Promise<PaginateResult<WithdrawalRequest>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    const queryFilter: any = {};
    
    // Находим sellerAccountId
    if (filter?.sellerAccountId) {
      checkId([filter.sellerAccountId]);
      queryFilter.sellerAccount = new Types.ObjectId(filter.sellerAccountId);
    } else if (filter?.sellerId) {
      checkId([filter.sellerId]);
      const account = await this.sellerAccountModel.findOne({ 
        seller: new Types.ObjectId(filter.sellerId) 
      }).select('_id');
      if (account) {
        queryFilter.sellerAccount = account._id;
      }
    }
    
    // Фильтр по статусу
    if (filter?.status) {
      queryFilter.status = filter.status;
    } else if (filter?.isActive !== undefined) {
      if (filter.isActive) {
        queryFilter.status = { 
          $in: [WithdrawalRequestStatus.PENDING, WithdrawalRequestStatus.PROCESSING] 
        };
      } else {
        queryFilter.status = { 
          $in: [WithdrawalRequestStatus.COMPLETED, WithdrawalRequestStatus.REJECTED, WithdrawalRequestStatus.FAILED] 
        };
      }
    }
    
    const totalDocs = await this.withdrawalModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const skip = (page - 1) * pageSize;
    
    const docs = await this.withdrawalModel
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
  // WITHDRAWAL REQUEST — COMMANDS
  // ====================================================
  
  async createWithdrawalRequest(
    command: Commands.CreateWithdrawalRequestCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest> {
    const { sellerId, payload } = command;
    checkId([sellerId]);
    
    // Находим счёт продавца
    const account = await this.sellerAccountModel.findOne({ 
      seller: new Types.ObjectId(sellerId) 
    });
    if (!account) {
      throw DomainError.notFound('SellerAccount для продавца', sellerId);
    }
    
    // Проверяем статус счёта
    if (account.status !== SellerAccountStatus.ACTIVE) {
      throw DomainError.invariant('Нельзя вывести средства с заблокированного счёта');
    }
    
    // Проверяем баланс
    if (account.balance < payload.amount) {
      throw DomainError.validation('Недостаточно средств на счёте');
    }
    
    // Проверяем наличие банковских реквизитов
    const { bankDetails } = account;
    if (!bankDetails?.accountNumber || !bankDetails?.bankName || !bankDetails?.bik) {
      throw DomainError.validation('Заполните банковские реквизиты перед выводом средств');
    }
    
    // Создаём заявку
    const withdrawal = new this.withdrawalModel({
      sellerAccount: account._id,
      amount: payload.amount,
      status: WithdrawalRequestStatus.PENDING,
      bankDetails: {
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        bik: bankDetails.bik,
        correspondentAccount: bankDetails.correspondentAccount,
        accountHolder: bankDetails.accountHolder || '',
        inn: bankDetails.inn || '',
      },
    });
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await withdrawal.save(saveOptions);
    return withdrawal;
  }
  
  async updateWithdrawalRequest(
    command: Commands.UpdateWithdrawalRequestCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest> {
    const { withdrawalRequestId, payload } = command;
    checkId([withdrawalRequestId]);
    
    const withdrawal = await this.withdrawalModel.findById(withdrawalRequestId);
    if (!withdrawal) {
      throw DomainError.notFound('WithdrawalRequest', withdrawalRequestId);
    }
    
    if (payload.status !== undefined) withdrawal.status = payload.status;
    if (payload.adminComment !== undefined) withdrawal.adminComment = payload.adminComment;
    if (payload.externalTransactionId !== undefined) withdrawal.externalTransactionId = payload.externalTransactionId;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await withdrawal.save(saveOptions);
    return withdrawal;
  }
  
  async approveWithdrawal(
    command: Commands.ApproveWithdrawalCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest> {
    const { withdrawalRequestId, payload } = command;
    checkId([withdrawalRequestId]);
    
    const withdrawal = await this.withdrawalModel.findById(withdrawalRequestId);
    if (!withdrawal) {
      throw DomainError.notFound('WithdrawalRequest', withdrawalRequestId);
    }
    
    if (withdrawal.status !== WithdrawalRequestStatus.PENDING && 
        withdrawal.status !== WithdrawalRequestStatus.PROCESSING) {
      throw DomainError.invariant(`Нельзя одобрить заявку в статусе ${withdrawal.status}`);
    }
    
    // Находим счёт продавца
    const account = await this.sellerAccountModel.findById(withdrawal.sellerAccount);
    if (!account) {
      throw DomainError.notFound('SellerAccount', withdrawal.sellerAccount.toString());
    }
    
    // Проверяем баланс
    if (account.balance < withdrawal.amount) {
      throw DomainError.invariant('Недостаточно средств на счёте');
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    // Списываем средства
    account.balance -= withdrawal.amount;
    account.totalWithdrawnAmount += withdrawal.amount;
    await account.save(saveOptions);
    
    // Обновляем заявку
    withdrawal.status = WithdrawalRequestStatus.COMPLETED;
    withdrawal.completedAt = new Date();
    if (payload?.adminComment) withdrawal.adminComment = payload.adminComment;
    if (payload?.externalTransactionId) withdrawal.externalTransactionId = payload.externalTransactionId;
    
    await withdrawal.save(saveOptions);
    return withdrawal;
  }
  
  async rejectWithdrawal(
    command: Commands.RejectWithdrawalCommand,
    options?: CommonCommandOptions
  ): Promise<WithdrawalRequest> {
    const { withdrawalRequestId, reason } = command;
    checkId([withdrawalRequestId]);
    
    const withdrawal = await this.withdrawalModel.findById(withdrawalRequestId);
    if (!withdrawal) {
      throw DomainError.notFound('WithdrawalRequest', withdrawalRequestId);
    }
    
    if (withdrawal.status !== WithdrawalRequestStatus.PENDING && 
        withdrawal.status !== WithdrawalRequestStatus.PROCESSING) {
      throw DomainError.invariant(`Нельзя отклонить заявку в статусе ${withdrawal.status}`);
    }
    
    withdrawal.status = WithdrawalRequestStatus.REJECTED;
    withdrawal.adminComment = reason;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await withdrawal.save(saveOptions);
    return withdrawal;
  }
}
