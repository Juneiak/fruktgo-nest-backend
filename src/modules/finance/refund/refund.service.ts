import { Injectable, Inject } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, PaginateResult, Types, Connection } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { checkId } from 'src/common/utils';
import { CommonCommandOptions } from 'src/common/types/commands';

import { RefundPort } from './refund.port';
import * as Commands from './refund.commands';
import * as Queries from './refund.queries';
import { Refund, RefundStatus } from './refund.schema';

import { SHOP_ACCOUNT_PORT, ShopAccountPort } from '../shop-account/shop-account.port';
import { 
  SettlementPeriodTransactionType, 
  SettlementPeriodTransactionStatus 
} from '../shop-account/schemas/settlement-period-transaction.schema';
import * as ShopAccountCommands from '../shop-account/shop-account.commands';

/**
 * =====================================================
 * СЕРВИС REFUND (ВОЗВРАТЫ)
 * =====================================================
 * 
 * Реализует RefundPort для работы с возвратами средств клиентам.
 * 
 * При создании возврата:
 * 1. Создаётся запись Refund
 * 2. Создаётся транзакция ORDER_REFUND в текущем расчётном периоде
 * 
 * При обработке:
 * - Отправляется запрос в ЮKassa (через OrderPaymentService)
 * 
 * При завершении:
 * - Транзакция переходит в COMPLETED
 * - Сумма вычитается из периода при его закрытии
 */
@Injectable()
export class RefundService implements RefundPort {
  
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Refund.name) private refundModel: Model<Refund>,
    @Inject(SHOP_ACCOUNT_PORT) private readonly shopAccountPort: ShopAccountPort,
  ) {}
  
  // ====================================================
  // QUERIES
  // ====================================================
  
  async getRefund(query: Queries.GetRefundQuery): Promise<Refund | null> {
    checkId([query.refundId]);
    return this.refundModel.findById(query.refundId).lean({ virtuals: true });
  }
  
  async getRefunds(query: Queries.GetRefundsQuery): Promise<PaginateResult<Refund>> {
    const { filter, pagination } = query;
    const { page = 1, pageSize = 10 } = pagination || {};
    
    const queryFilter: any = {};
    
    if (filter?.shopAccountId) {
      checkId([filter.shopAccountId]);
      queryFilter.shopAccount = new Types.ObjectId(filter.shopAccountId);
    }
    if (filter?.orderId) {
      checkId([filter.orderId]);
      queryFilter.order = new Types.ObjectId(filter.orderId);
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
        queryFilter.status = { $in: [RefundStatus.CREATED, RefundStatus.PROCESSING] };
      } else {
        queryFilter.status = { $in: [RefundStatus.COMPLETED, RefundStatus.FAILED, RefundStatus.CANCELED] };
      }
    }
    
    const totalDocs = await this.refundModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalDocs / pageSize);
    const skip = (page - 1) * pageSize;
    
    const docs = await this.refundModel
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
  
  async getRefundByOrder(query: Queries.GetRefundByOrderQuery): Promise<Refund | null> {
    checkId([query.orderId]);
    return this.refundModel.findOne({
      order: new Types.ObjectId(query.orderId),
    }).lean({ virtuals: true });
  }
  
  async getRefundStats(query: Queries.GetRefundStatsQuery): Promise<{
    totalCount: number;
    totalAmount: number;
    completedCount: number;
    completedAmount: number;
    pendingCount: number;
    pendingAmount: number;
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
    
    const result = await this.refundModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', RefundStatus.COMPLETED] }, 1, 0] }
          },
          completedAmount: {
            $sum: { $cond: [{ $eq: ['$status', RefundStatus.COMPLETED] }, '$amount', 0] }
          },
          pendingCount: {
            $sum: { 
              $cond: [
                { $in: ['$status', [RefundStatus.CREATED, RefundStatus.PROCESSING]] }, 
                1, 
                0
              ] 
            }
          },
          pendingAmount: {
            $sum: { 
              $cond: [
                { $in: ['$status', [RefundStatus.CREATED, RefundStatus.PROCESSING]] }, 
                '$amount', 
                0
              ] 
            }
          },
        },
      },
    ]);
    
    if (result.length === 0) {
      return {
        totalCount: 0,
        totalAmount: 0,
        completedCount: 0,
        completedAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
      };
    }
    
    return result[0];
  }
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  async createRefund(
    command: Commands.CreateRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund> {
    const { payload } = command;
    checkId([payload.shopAccountId, payload.orderId, payload.initiatedBy.id]);
    
    // Проверяем, что возврат для этого заказа ещё не создан
    const existingRefund = await this.refundModel.findOne({
      order: new Types.ObjectId(payload.orderId),
      status: { $nin: [RefundStatus.CANCELED, RefundStatus.FAILED] },
    });
    if (existingRefund) {
      throw DomainError.conflict('Возврат для этого заказа уже существует');
    }
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      // 1. Создаём возврат
      const refund = new this.refundModel({
        shopAccount: new Types.ObjectId(payload.shopAccountId),
        order: new Types.ObjectId(payload.orderId),
        amount: payload.amount,
        reason: payload.reason,
        description: payload.description,
        status: RefundStatus.CREATED,
        initiatedBy: {
          type: payload.initiatedBy.type,
          id: new Types.ObjectId(payload.initiatedBy.id),
        },
      });
      
      await refund.save({ session });
      
      // 2. Создаём транзакцию в расчётном периоде
      const transaction = await this.shopAccountPort.createTransaction(
        new ShopAccountCommands.CreateTransactionCommand({
          shopAccountId: payload.shopAccountId,
          type: SettlementPeriodTransactionType.ORDER_REFUND,
          amount: payload.amount,
          status: SettlementPeriodTransactionStatus.PENDING, // Ждём завершения возврата
          description: `Возврат по заказу`,
          references: {
            orderId: payload.orderId,
            refundId: refund._id.toString(),
          },
        }),
        { session }
      );
      
      // 3. Сохраняем ссылки
      refund.references = {
        transactionId: transaction._id.toString(),
      };
      refund.settlementPeriod = transaction.settlementPeriod;
      await refund.save({ session });
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return refund;
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
  
  async processRefund(
    command: Commands.ProcessRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund> {
    const { refundId } = command;
    checkId([refundId]);
    
    const refund = await this.refundModel.findById(refundId);
    if (!refund) {
      throw DomainError.notFound('Refund', refundId);
    }
    
    if (refund.status !== RefundStatus.CREATED) {
      throw DomainError.invariant(`Нельзя обработать возврат в статусе ${refund.status}`);
    }
    
    // Переводим в статус обработки
    refund.status = RefundStatus.PROCESSING;
    
    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    
    await refund.save(saveOptions);
    
    // TODO: Здесь должна быть интеграция с OrderPaymentService для возврата через ЮKassa
    // await this.orderPaymentService.createRefund({...})
    
    return refund;
  }
  
  async completeRefund(
    command: Commands.CompleteRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund> {
    const { refundId, payload } = command;
    checkId([refundId]);
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      const refund = await this.refundModel.findById(refundId).session(session);
      if (!refund) {
        throw DomainError.notFound('Refund', refundId);
      }
      
      if (refund.status !== RefundStatus.PROCESSING && refund.status !== RefundStatus.CREATED) {
        throw DomainError.invariant(`Нельзя завершить возврат в статусе ${refund.status}`);
      }
      
      // Проверяем наличие транзакции
      if (!refund.references?.transactionId) {
        throw DomainError.invariant('Транзакция возврата не найдена');
      }
      
      // Обновляем возврат
      refund.status = RefundStatus.COMPLETED;
      refund.references.paymentId = payload.yookassaRefundId;
      await refund.save({ session });
      
      // Обновляем статус транзакции
      await this.shopAccountPort.updateTransaction(
        new ShopAccountCommands.UpdateTransactionCommand(refund.references.transactionId, {
          status: SettlementPeriodTransactionStatus.COMPLETED,
        }),
        { session }
      );
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return refund;
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
  
  async cancelRefund(
    command: Commands.CancelRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund> {
    const { refundId, reason } = command;
    checkId([refundId]);
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      const refund = await this.refundModel.findById(refundId).session(session);
      if (!refund) {
        throw DomainError.notFound('Refund', refundId);
      }
      
      // Можно отменить только созданный возврат
      if (refund.status !== RefundStatus.CREATED) {
        throw DomainError.invariant(`Нельзя отменить возврат в статусе ${refund.status}`);
      }
      
      // Обновляем возврат
      refund.status = RefundStatus.CANCELED;
      if (reason) {
        refund.description = `${refund.description || ''}\nОтменён: ${reason}`;
      }
      await refund.save({ session });
      
      // Отменяем транзакцию
      if (refund.references?.transactionId) {
        await this.shopAccountPort.cancelTransaction(
          new ShopAccountCommands.CancelTransactionCommand(
            refund.references.transactionId,
            reason
          ),
          { session }
        );
      }
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return refund;
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
  
  async failRefund(
    command: Commands.FailRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund> {
    const { refundId, reason } = command;
    checkId([refundId]);
    
    // Используем переданную сессию или создаём новую
    const session = options?.session ?? await this.connection.startSession();
    const isExternalSession = !!options?.session;
    
    if (!isExternalSession) {
      session.startTransaction();
    }
    
    try {
      const refund = await this.refundModel.findById(refundId).session(session);
      if (!refund) {
        throw DomainError.notFound('Refund', refundId);
      }
      
      if (refund.status === RefundStatus.COMPLETED || refund.status === RefundStatus.CANCELED) {
        throw DomainError.invariant(`Нельзя пометить как неудавшийся возврат в статусе ${refund.status}`);
      }
      
      // Обновляем возврат
      refund.status = RefundStatus.FAILED;
      refund.description = `${refund.description || ''}\nОшибка: ${reason}`;
      await refund.save({ session });
      
      // Помечаем транзакцию как неудавшуюся
      if (refund.references?.transactionId) {
        await this.shopAccountPort.updateTransaction(
          new ShopAccountCommands.UpdateTransactionCommand(refund.references.transactionId, {
            status: SettlementPeriodTransactionStatus.FAILED,
            internalComment: reason,
          }),
          { session }
        );
      }
      
      if (!isExternalSession) {
        await session.commitTransaction();
      }
      
      return refund;
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
}
