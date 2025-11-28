import { Injectable, Inject } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, PaginateResult, Types, Connection } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';

import { PenaltyPort } from './penalty.port';
import * as Commands from './penalty.commands';
import * as Queries from './penalty.queries';
import { Penalty, PenaltyStatus } from './penalty.schema';

import { SHOP_ACCOUNT_PORT, ShopAccountPort } from '../shop-account/shop-account.port';
import { 
  SettlementPeriodTransactionType, 
  SettlementPeriodTransactionStatus 
} from '../shop-account/schemas/settlement-period-transaction.schema';
import * as ShopAccountCommands from '../shop-account/shop-account.commands';
import * as ShopAccountQueries from '../shop-account/shop-account.queries';

/**
 * =====================================================
 * СЕРВИС PENALTY (ШТРАФЫ)
 * =====================================================
 * 
 * Реализует PenaltyPort для работы со штрафами магазинов.
 * 
 * При создании штрафа:
 * 1. Создаётся запись Penalty
 * 2. Создаётся транзакция PENALTY в текущем расчётном периоде (статус PENDING)
 * 
 * При подтверждении:
 * - Транзакция переходит в COMPLETED
 * - Сумма списывается из периода при его закрытии
 * 
 * При отмене:
 * - Транзакция переходит в CANCELED
 * - Сумма не списывается
 */
@Injectable()
export class PenaltyService implements PenaltyPort {
  
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Penalty.name) private penaltyModel: Model<Penalty>,
    @Inject(SHOP_ACCOUNT_PORT) private readonly shopAccountPort: ShopAccountPort,
  ) {}
  
  // ====================================================
  // QUERIES
  // ====================================================
  
  async getPenalty(query: Queries.GetPenaltyQuery): Promise<Penalty | null> {
    checkId([query.penaltyId]);
    return this.penaltyModel.findById(query.penaltyId).lean({ virtuals: true });
  }
  
  async getPenalties(query: Queries.GetPenaltiesQuery): Promise<PaginateResult<Penalty>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    const queryFilter: any = {};
    
    if (filter?.shopAccountId) {
      checkId([filter.shopAccountId]);
      queryFilter.shopAccount = new Types.ObjectId(filter.shopAccountId);
    }
    if (filter?.settlementPeriodId) {
      checkId([filter.settlementPeriodId]);
      queryFilter.settlementPeriod = new Types.ObjectId(filter.settlementPeriodId);
    }
    if (filter?.status) {
      queryFilter.status = filter.status;
    }
    if (filter?.reason) {
      queryFilter.reason = filter.reason;
    }
    if (filter?.isActive !== undefined) {
      if (filter.isActive) {
        queryFilter.status = { $in: [PenaltyStatus.CREATED, PenaltyStatus.CONTESTED] };
      } else {
        queryFilter.status = { $in: [PenaltyStatus.CONFIRMED, PenaltyStatus.CANCELED] };
      }
    }
    if (filter?.orderId) {
      queryFilter['references.orderId'] = filter.orderId;
    }
    
    const totalDocs = await this.penaltyModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const skip = (page - 1) * pageSize;
    
    const docs = await this.penaltyModel
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
  
  async getPenaltyStats(query: Queries.GetPenaltyStatsQuery): Promise<{
    totalCount: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    contestedCount: number;
    canceledCount: number;
  }> {
    const { filter } = query;
    checkId([filter.shopAccountId]);
    
    const matchStage: any = {
      shopAccount: new Types.ObjectId(filter.shopAccountId),
    };
    
    if (filter.fromDate) {
      matchStage.createdAt = { $gte: filter.fromDate };
    }
    if (filter.toDate) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: filter.toDate };
    }
    
    const result = await this.penaltyModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          confirmedCount: {
            $sum: { $cond: [{ $eq: ['$status', PenaltyStatus.CONFIRMED] }, 1, 0] }
          },
          confirmedAmount: {
            $sum: { $cond: [{ $eq: ['$status', PenaltyStatus.CONFIRMED] }, '$amount', 0] }
          },
          contestedCount: {
            $sum: { $cond: [{ $eq: ['$status', PenaltyStatus.CONTESTED] }, 1, 0] }
          },
          canceledCount: {
            $sum: { $cond: [{ $eq: ['$status', PenaltyStatus.CANCELED] }, 1, 0] }
          },
        },
      },
    ]);
    
    if (result.length === 0) {
      return {
        totalCount: 0,
        totalAmount: 0,
        confirmedCount: 0,
        confirmedAmount: 0,
        contestedCount: 0,
        canceledCount: 0,
      };
    }
    
    return result[0];
  }
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  async createPenalty(
    command: Commands.CreatePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty> {
    const { payload } = command;
    checkId([payload.shopAccountId]);
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      // 1. Создаём штраф
      const penalty = new this.penaltyModel({
        shopAccount: new Types.ObjectId(payload.shopAccountId),
        amount: payload.amount,
        reason: payload.reason,
        description: payload.description,
        status: PenaltyStatus.CREATED,
        references: {
          orderId: payload.orderId,
        },
      });
      
      await penalty.save({ session });
      
      // 2. Создаём транзакцию в расчётном периоде
      const transaction = await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: payload.shopAccountId,
          type: SettlementPeriodTransactionType.PENALTY,
          amount: payload.amount,
          status: SettlementPeriodTransactionStatus.PENDING, // Ждём подтверждения штрафа
          description: `Штраф: ${payload.description}`,
          references: {
            orderId: payload.orderId,
            penaltyId: penalty._id.toString(),
          },
        }),
        { session }
      );
      
      // 3. Сохраняем ссылки
      penalty.references.transactionId = transaction._id.toString();
      penalty.settlementPeriod = transaction.settlementPeriod;
      await penalty.save({ session });
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return penalty;
    } catch (error) {
      if (!isExternalSession) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (!isExternalSession) {
        session.endSession();
      }
    }
  }
  
  async contestPenalty(
    command: Commands.ContestPenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty> {
    const { penaltyId, payload } = command;
    checkId([penaltyId]);
    
    const penalty = await this.penaltyModel.findById(penaltyId);
    if (!penalty) {
      throw DomainError.notFound('Penalty', penaltyId);
    }
    
    // Можно оспорить только созданный штраф
    if (penalty.status !== PenaltyStatus.CREATED) {
      throw DomainError.invariant('Штраф можно оспорить только в статусе CREATED');
    }
    
    // Проверяем срок оспаривания (7 дней)
    const contestDeadline = new Date(penalty.createdAt);
    contestDeadline.setDate(contestDeadline.getDate() + 7);
    if (new Date() > contestDeadline) {
      throw DomainError.invariant('Срок оспаривания штрафа истёк (7 дней)');
    }
    
    penalty.status = PenaltyStatus.CONTESTED;
    penalty.sellerConsest = payload.contestReason;
    penalty.sellerConsestDate = new Date();
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await penalty.save(saveOptions);
    return penalty;
  }
  
  async resolvePenalty(
    command: Commands.ResolvePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty> {
    const { penaltyId, payload } = command;
    checkId([penaltyId]);
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      const penalty = await this.penaltyModel.findById(penaltyId).session(session);
      if (!penalty) {
        throw DomainError.notFound('Penalty', penaltyId);
      }
      
      // Можно решить только активный штраф
      if (penalty.status !== PenaltyStatus.CREATED && penalty.status !== PenaltyStatus.CONTESTED) {
        throw DomainError.invariant(`Нельзя изменить решение по штрафу в статусе ${penalty.status}`);
      }
      
      // Если штраф был оспорен, требуется ответ
      if (penalty.status === PenaltyStatus.CONTESTED && !payload.adminDecision) {
        throw DomainError.validation('Для оспоренного штрафа требуется указать ответ');
      }
      
      // Проверяем наличие транзакции
      if (!penalty.references.transactionId) {
        throw DomainError.invariant('Транзакция штрафа не найдена');
      }
      
      // Обновляем статус штрафа
      penalty.status = payload.status;
      if (payload.adminDecision) {
        penalty.adminDecision = payload.adminDecision;
        penalty.adminDecisionDate = new Date();
      }
      
      await penalty.save({ session });
      
      // Обновляем статус транзакции
      const newTransactionStatus = payload.status === PenaltyStatus.CONFIRMED
        ? SettlementPeriodTransactionStatus.COMPLETED
        : SettlementPeriodTransactionStatus.CANCELED;
      
      await this.shopAccountPort.updateTransaction(
        new ShopAccountCommands.UpdateTransactionCommand(penalty.references.transactionId, {
          status: newTransactionStatus,
        }),
        { session }
      );
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return penalty;
    } catch (error) {
      if (!isExternalSession) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      if (!isExternalSession) {
        session.endSession();
      }
    }
  }
  
  async updatePenalty(
    command: Commands.UpdatePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty> {
    const { penaltyId, payload } = command;
    checkId([penaltyId]);
    
    const penalty = await this.penaltyModel.findById(penaltyId);
    if (!penalty) {
      throw DomainError.notFound('Penalty', penaltyId);
    }
    
    // Можно обновить только неподтверждённый штраф
    if (penalty.status === PenaltyStatus.CONFIRMED || penalty.status === PenaltyStatus.CANCELED) {
      throw DomainError.invariant(`Нельзя изменить штраф в статусе ${penalty.status}`);
    }
    
    if (payload.description !== undefined) {
      penalty.description = payload.description;
    }
    if (payload.amount !== undefined) {
      penalty.amount = payload.amount;
      // TODO: обновить сумму в транзакции
    }
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await penalty.save(saveOptions);
    return penalty;
  }
}
