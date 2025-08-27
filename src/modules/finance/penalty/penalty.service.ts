import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Penalty, PenaltyStatus } from './penalty.schema';
import { PaginationQueryDto, PaginationMetaDto } from 'src/common/dtos';
import { checkId } from 'src/common/utils';
import { ContestPenaltyDto, CreatePenaltyDto, FinalizePenaltyDto, PenaltyFilterQueryDto, PenaltyStatusFilter, UpdatePenaltyDto } from './penalty.request.dtos';
import { ShopAccountPublicService } from 'src/modules/finance/shop-account/shop-account.public.service';
import { SettlementPeriodTransactionDirection, SettlementPeriodTransactionStatus, SettlementPeriodTransactionType } from 'src/modules/finance/shop-account/schemas/settlement-period-transaction.schema';
import { ShopAccount } from 'src/modules/finance/shop-account/schemas/shop-account.schema';

@Injectable()
export class PenaltyService {

  constructor(
    @InjectModel('Penalty') private penaltyModel: Model<Penalty>,
    @InjectModel('ShopAccount') private shopAccountModel: Model<ShopAccount>,
    private shopAccounPublicService: ShopAccountPublicService,
  ) {}

  async getPenalty(penaltyId: string): Promise<Penalty> {
    checkId([penaltyId]);
    const penalty = await this.penaltyModel.findById(penaltyId);
    if (!penalty) throw new NotFoundException('Штраф не найден');
    return penalty;
  }


  async getPenalties(
    filterQuery?: PenaltyFilterQueryDto,
    paginationQuery?: PaginationQueryDto
  ): Promise<{penalties: Penalty[], pagination: PaginationMetaDto}> {

    const query = this.penaltyModel.find();
    
    if (filterQuery?.status) {
      if (filterQuery.status === PenaltyStatusFilter.ACTIVE) query.where('status').in([PenaltyStatus.CREATED, PenaltyStatus.CONTESTED]);
      else if (filterQuery.status === PenaltyStatusFilter.INACTIVE) query.where('status').in([PenaltyStatus.CANCELED, PenaltyStatus.CONFIRMED]);
      else query.where('status').equals(filterQuery.status);
    }
    if (filterQuery?.shopAccountId) {
      checkId([filterQuery.shopAccountId]);
      query.where('shopAccount').equals(new Types.ObjectId(filterQuery.shopAccountId));
    }
    if (filterQuery?.settlementPeriodId) {
      checkId([filterQuery.settlementPeriodId]);
      query.where('settlementPeriod').equals(new Types.ObjectId(filterQuery.settlementPeriodId));
    }
    
    const { page = 1, pageSize = 10 } = paginationQuery || {};
    const skip = (page - 1) * pageSize;
    query.sort({ createdAt: -1 });
    const totalItems = await this.penaltyModel.countDocuments(query.getFilter());
    const penalties = await query.skip(skip).limit(pageSize).lean({ virtuals: true }).exec();
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      penalties,
      pagination: { totalItems, totalPages, currentPage: page, pageSize }
    };
  }


  async createPenalty(createPenaltyDto: CreatePenaltyDto): Promise<Penalty> {
    checkId([createPenaltyDto.shopAccountId]);

    const session = await this.penaltyModel.db.startSession();
    let createdPenalty: Penalty;
    
    try {
      await session.startTransaction();
      
      // Создаем штраф в сессии
      const penalty = new this.penaltyModel({
        shopAccount: createPenaltyDto.shopAccountId,
        amount: createPenaltyDto.amount,
        reason: createPenaltyDto.reason,
        description: createPenaltyDto.description,
        status: createPenaltyDto.status,
        references: {
          orderId: createPenaltyDto.orderId,
        },
      });
      createdPenalty = await penalty.save({ session });

      // Создаем транзакцию расчетного периода в той же сессии
      const createdSettlementPeriodTransaction = await this.shopAccounPublicService.createSettlementPeriodTransaction({
        shopAccountId: createPenaltyDto.shopAccountId,
        amount: createPenaltyDto.amount,
        direction: SettlementPeriodTransactionDirection.DEBIT,
        type: SettlementPeriodTransactionType.PENALTY,
        description: createPenaltyDto.description,
        referenceOrderId: createPenaltyDto.orderId || undefined,
        referencePenaltyId: createdPenalty._id.toString(),
      }, session);

      // Обновляем штраф ссылкой на транзакцию
      createdPenalty.references.transactionId = createdSettlementPeriodTransaction._id.toString();
      createdPenalty.settlementPeriod = createdSettlementPeriodTransaction.settlementPeriod;
      await createdPenalty.save({ session });

      // Фиксируем транзакцию
      await session.commitTransaction();
      return createdPenalty;
    } catch (error) {
      // В случае ошибки отменяем все изменения
      await session.abortTransaction();
      throw error;
    } finally {
      // Закрываем сессию в любом случае
      session.endSession();
    }
  }
    

  async updatePenalty(penaltyId: string, updatePenaltyDto: UpdatePenaltyDto): Promise<Penalty> {
    checkId([penaltyId]);
    const penalty = await this.penaltyModel.findByIdAndUpdate(penaltyId, updatePenaltyDto, { new: true }).lean({ virtuals: true }).exec();
    if (!penalty) throw new NotFoundException('Штраф не найден');
    return penalty;
  }


  async contestPenalty(penaltyId: string, contestPenaltyDto: ContestPenaltyDto): Promise<Penalty> {
    checkId([penaltyId]);

    const foundPenalty = await this.penaltyModel.findById(penaltyId);
    if (!foundPenalty) throw new NotFoundException('Штраф не найден');
    if (foundPenalty.status !== PenaltyStatus.CREATED) throw new BadRequestException('Штраф не может быть оспорован');
    
    const penalty = await this.penaltyModel.findByIdAndUpdate(penaltyId, {sellerConsest: contestPenaltyDto.consest, sellerConsestDate: new Date(), status: PenaltyStatus.CONTESTED}, { new: true }).lean({ virtuals: true }).exec();
    if (!penalty) throw new NotFoundException('Штраф не найден');
    
    return penalty;
  }


  async finalizePenalty(penaltyId: string, finalizePenaltyDto: FinalizePenaltyDto): Promise<Penalty> {
    checkId([penaltyId]);

    // Начинаем сессию MongoDB
    const session = await this.penaltyModel.db.startSession();
    let finalPenalty: Penalty;

    try {
      // Запускаем транзакцию
      await session.startTransaction();

      // Получаем штраф в контексте текущей сессии
      const foundPenalty = await this.penaltyModel.findById(penaltyId).session(session).exec();
      if (!foundPenalty) throw new NotFoundException('Штраф не найден');

      // Создаем объект с обновляемыми полями
      const updateData: any = {
        status: finalizePenaltyDto.status
      };
      
      // Если штраф находится в статусе обжалования, требуется ответ администратора
      if (foundPenalty.status === PenaltyStatus.CONTESTED) {
        if (!finalizePenaltyDto.answerToContest) throw new BadRequestException('Для штрафа в статусе обжалования требуется указать ответ');
        updateData.adminDecision = finalizePenaltyDto.answerToContest;
        updateData.adminDecisionDate = new Date();
      }

      // Проверяем наличие транзакции
      const transactionId = foundPenalty.references.transactionId;
      if (!transactionId) throw new NotFoundException('Транзакция расчетного периода не найдена');
      
      // Обновляем штраф в рамках текущей сессии
      const penalty = await this.penaltyModel.findByIdAndUpdate(
        penaltyId, 
        updateData, 
        { new: true, session: session }
      ).lean({ virtuals: true }).exec();
      
      if (!penalty) throw new NotFoundException('Штраф не найден');
      finalPenalty = penalty;

      // Обновляем статус транзакции в соответствии со статусом штрафа
      if (penalty.status === PenaltyStatus.CONFIRMED || penalty.status === PenaltyStatus.CANCELED) {
        let newTransactionStatus: SettlementPeriodTransactionStatus;
        
        if (penalty.status === PenaltyStatus.CONFIRMED) newTransactionStatus = SettlementPeriodTransactionStatus.COMPLETED;
        else newTransactionStatus = SettlementPeriodTransactionStatus.CANCELED;
        
        // Обновляем транзакцию в рамках текущей сессии
        await this.shopAccounPublicService.updateSettlementPeriodTransaction(
          transactionId, 
          { status: newTransactionStatus },
          session
        );
      }

      await session.commitTransaction();
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    return finalPenalty;
  }
}
