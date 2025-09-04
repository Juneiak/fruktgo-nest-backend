import { BadRequestException, Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { SettlementPeriodTransaction, SettlementPeriodTransactionDirection, SettlementPeriodTransactionStatus, SettlementPeriodTransactionType } from './schemas/settlement-period-transaction.schema';
import { SettlementPeriod, SettlementPeriodStatus, SettlementPeriodAmounts } from './schemas/settlement-period.schema';
import { ShopAccount, AccountStatus } from './schemas/shop-account.schema';
import { Shop } from 'src/modules/shop/shop/shop.schema';
import { checkId } from 'src/common/utils';
import { PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { SettlementPeriodFilterQueryDto, SettlementPeriodTransactionFilterQueryDto } from './admin/shop-account.admin.request.dto';
import { CreateSettlementPeriodTransactionDto, UpdateSettlementPeriodTransactionDto } from './shared/shop-account.shared.request.dto';

export type SettlementPeriodManualUpdateFields = {
  internalComment?: string;
}

export type ShopAccountManualUpdateFields = {
  status?: AccountStatus;
  freezePeriodDays?: number;
};

@Injectable()
export class ShopAccountService {

  constructor(
    @InjectModel('SettlementPeriodTransaction') private settlementPeriodTransactionModel: Model<SettlementPeriodTransaction>,
    @InjectModel('SettlementPeriod') private settlementPeriodModel: Model<SettlementPeriod>,
    @InjectModel('ShopAccount') private shopAccountModel: Model<ShopAccount>,
  ) {}

  // ====================================================
  // SHOP ACCOUNT
  // ====================================================
  /**
   * Получение аккаунта магазина
   * @param shopId - ID магазина
   * @returns Аккаунт магазина
   */
  async getShopAccount(shopId: string): Promise<ShopAccount> {
    checkId([shopId]);
    const shopAccount = await this.shopAccountModel.findOne({shop: new Types.ObjectId(shopId)}).lean({ virtuals: true }).exec();
    if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    
    return shopAccount;
  }


  /**
   * Обновление аккаунта магазина
   * @param shopAccountId - ID аккаунта магазина
   * @param dataToUpdate - Объект с полями для обновления
   * @returns Обновленный аккаунт магазина
   */
  async updateShopAccount(shopAccountId: string, dataToUpdate:ShopAccountManualUpdateFields) {
    const shopAccount = await this.shopAccountModel.findById(shopAccountId).exec();
    if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    
    Object.assign(shopAccount, dataToUpdate);
    const updatedShopAccount = await shopAccount.save();

    return updatedShopAccount;
  }



  // ====================================================
  // SETTLEMENT PERIOD
  // ====================================================
  /**
   * Проверка, что расчётный период принадлежит магазину.
   */
  async validateSettlementPeriodOwnershipToShop(
    shopId: string,
    settlementPeriodId: string
  ): Promise<void> {
    checkId([settlementPeriodId, shopId]);
    const shopAccount = await this.shopAccountModel.findOne({shop: new Types.ObjectId(shopId)}).select('_id shop').lean({ virtuals: true }).exec();
    if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    
    const isSettlementPeriodExists = await this.settlementPeriodModel.exists({shopAccount: shopAccount._id, _id: new Types.ObjectId(settlementPeriodId)});
    if (!isSettlementPeriodExists) throw new ForbiddenException('Период не принадлежит данному магазину');
  }

  
  /**
   * Получение расчетного периода магазина
   */
  async getShopSettlementPeriod( settlementPeriodId: string ): Promise<SettlementPeriod> {
    checkId([settlementPeriodId]);
    const settlementPeriod = await this.settlementPeriodModel.findById(settlementPeriodId).exec();
    if (!settlementPeriod) throw new NotFoundException('Период не найден');
    
    return settlementPeriod;
  }


  /**
   * Получение списка расчетных периодов магазина
   * @param shopId - ID магазина
   * @param filterQuery - Параметры фильтрации периодов
   * @param paginationQuery - Параметры пагинации
   * @returns Пагинированный список расчетных периодов
   */
  async getShopSettlementPeriods(
    shopId: string,
    filterQuery?: SettlementPeriodFilterQueryDto,
    paginationQuery?: PaginationQueryDto
  ): Promise<{periods: SettlementPeriod[], pagination: PaginationMetaDto}> {
    
    const shopAccount = await this.shopAccountModel.findOne({shop: new Types.ObjectId(shopId)}).select('_id shop').lean({ virtuals: true }).exec();
    if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    
    // Формируем базовый запрос
    const query = this.settlementPeriodModel.find({shopAccount: shopAccount._id});
    
    // Добавляем фильтры если они указаны
    if (filterQuery) {
      if (filterQuery.fromDate) query.where('createdAt').gte(filterQuery.fromDate.getTime());
      if (filterQuery.toDate) query.where('createdAt').lte(filterQuery.toDate.getTime());
    }
    
    const { page = 1, pageSize = 10 } = paginationQuery || {};
    const skip = (page - 1) * pageSize;
    
    // Сортировка по дате создания (от новых к старым)
    query.sort({ createdAt: -1 });
    
    // Получаем общее количество записей для пагинации
    const totalItems = await this.settlementPeriodModel.countDocuments(query.getFilter());
    
    // Выполняем запрос с пагинацией и преобразуем в простые объекты
    const periods = await query.skip(skip).limit(pageSize).lean({ virtuals: true }).exec();
    
    // Формируем метаданные пагинации
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = {totalItems, totalPages, currentPage: page, pageSize};
    
    return { periods, pagination };
  }


  /**
   * Метод для открытия нового расчетного периода
   * @param shopAccountId - ID аккаунта магазина
   * @returns Новый открытый расчетный период
   */
  async openSettlementPeriod(shopAccountId: string): Promise<SettlementPeriod> {
    checkId([shopAccountId]);

    const shopAccount = await this.shopAccountModel.findById(shopAccountId).exec();
    if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    
    // Проверяем, что у магазина нет активного периода
    const hasActivePeriod = await this.settlementPeriodModel.exists({ 
      shopAccount: new Types.ObjectId(shopAccountId), 
      status: SettlementPeriodStatus.ACTIVE 
    });
    if (hasActivePeriod) throw new BadRequestException('У магазина уже есть активный расчетный период');
    
    // Получаем последний период, чтобы определить номер нового периода
    const lastPeriod = await this.settlementPeriodModel.findOne({ 
      shopAccount: new Types.ObjectId(shopAccountId) 
    }).sort({ periodNumber: -1 }).lean().exec();
    
    const periodNumber = lastPeriod ? lastPeriod.periodNumber + 1 : 1;
    
    // Создаем новый период
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + shopAccount.freezePeriodDays); // Период заморозки из настроек магазина
    
    const newPeriod = new this.settlementPeriodModel({
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
      }
    });
    
    // Сохраняем период и обновляем аккаунт магазина в рамках транзакции
    const session = await this.settlementPeriodModel.db.startSession();
    session.startTransaction();
    
    try {
      const savedPeriod = await newPeriod.save({ session });
      
      // Обновляем ссылку на текущий период в аккаунте магазина
      shopAccount.currentSettlementPeriod = savedPeriod._id;
      await shopAccount.save({ session });
      
      // Коммит транзакции
      await session.commitTransaction();
      
      return savedPeriod;
    } catch (error) {
      // Откат транзакции в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      // Завершаем сессию
      session.endSession();
    }
  }


  /**
   * Обновление расчетного периода
   * @param settlementPeriodId - ID расчетного периода
   * @param dataToUpdate - Объект с полями для обновления
   * @returns Обновленный расчетный период
   */
  async updateSettlementPeriod(settlementPeriodId: string, dataToUpdate: SettlementPeriodManualUpdateFields): Promise<SettlementPeriod> {
    checkId([settlementPeriodId]);
    const updatedSettlementPeriod = await this.settlementPeriodModel.findByIdAndUpdate(settlementPeriodId, dataToUpdate, { new: true }).exec();
    if (!updatedSettlementPeriod) throw new NotFoundException('Период не найден');
    return updatedSettlementPeriod;
  }



  /**
   * Метод для закрытия расчетного периода
   * @param settlementPeriodId - ID расчетного периода
   * @returns Закрытый расчетный период
   */
  //TODO: проверить
  async closeSettlementPeriod(settlementPeriodId: string): Promise<SettlementPeriod> {
    
    checkId([settlementPeriodId]);
    
    const period = await this.settlementPeriodModel.findById(settlementPeriodId);
    if (!period) throw new NotFoundException('Расчетный период не найден');
    
    // Проверяем, что период имеет статус ACTIVE
    if (period.status !== SettlementPeriodStatus.ACTIVE) {
      throw new BadRequestException(`Нельзя закрыть период в статусе ${period.status}`);
    }
    
    // Создаем сессию для транзакционных операций
    const session = await this.settlementPeriodModel.db.startSession();
    session.startTransaction();
    
    try {
      // Получаем все транзакции за период
      const transactions = await this.settlementPeriodTransactionModel.find({ 
        settlementPeriod: period._id,
        status: SettlementPeriodTransactionStatus.COMPLETED
      }).session(session).lean().exec();
      
      // Подсчитываем суммы по типам транзакций
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
      
      // Итоговая сумма к выплате
      let totalAmount = 0;
      
      // Обрабатываем каждую транзакцию
      for (const transaction of transactions) {
        const multiplier = transaction.direction === 'credit' ? 1 : -1;
        const amount = transaction.amount * multiplier;
        
        // Добавляем к итоговой сумме
        totalAmount += amount;
        
        // Распределяем по типам
        switch (transaction.type) {
          case SettlementPeriodTransactionType.ORDER_INCOME:
            amounts.orderCompletions += transaction.direction === 'credit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.ORDER_REFUND:
            amounts.refunds += transaction.direction === 'debit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.PENALTY:
            amounts.penalties += transaction.direction === 'debit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.COMMISSION:
            amounts.commissions += transaction.direction === 'debit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.BONUS:
            amounts.bonus += transaction.direction === 'credit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.CORRECTION_IN:
            amounts.correctionsIn += transaction.direction === 'credit' ? transaction.amount : 0;
            break;
          case SettlementPeriodTransactionType.CORRECTION_OUT:
            amounts.correctionsOut += transaction.direction === 'debit' ? transaction.amount : 0;
            break;
        }
      }
      
      // Обновляем данные периода
      period.amounts = amounts;
      period.totalAmount = totalAmount;
      period.status = SettlementPeriodStatus.PENDING_APPROVAL;
      await period.save({ session });
      
      // Находим магазин для создания нового периода
      const shopAccount = await this.shopAccountModel.findById(period.shopAccount).session(session);
      
      if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');
      
      // Создаем новый активный период
      const newPeriod = new this.settlementPeriodModel({
        shopAccount: period.shopAccount,
        periodNumber: period.periodNumber + 1,
        startDate: new Date(), // Текущая дата как начало периода
        endDate: new Date(Date.now() + shopAccount.freezePeriodDays * 24 * 60 * 60 * 1000), // Дата окончания = сейчас + период заморозки
        releaseDate: new Date,
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
        }
      });
      
      const savedNewPeriod = await newPeriod.save({ session });
      
      // Обновляем текущий период в аккаунте магазина
      shopAccount.currentSettlementPeriod = savedNewPeriod._id;
      await shopAccount.save({ session });
      
      // Коммит транзакции
      await session.commitTransaction();
      
      return period;
    } catch (error) {
      // Откат транзакции в случае ошибки
      await session.abortTransaction();
      throw error;
    } finally {
      // Завершаем сессию
      session.endSession();
    }
  }


  /**
   * Метод для одобрения и финализации расчетного периода администратором
   * (изменяет статус с PENDING_APPROVAL на RELEASED)
   * После одобрения период переходит в статус RELEASED, средства списываются
   * с shopAccount.availableAmount и перечисляются на аккаунт продавца (SellerAccount)
   * @param settlementPeriodId - Идентификатор расчетного периода, который необходимо одобрить
   * @param comment - Опциональный комментарий администратора к расчетному периоду
   * @returns Информация о расчетном периоде после одобрения в формате DTO
   */
  //TODO: проверить
  async approveSettlementPeriod(settlementPeriodId: string, comment?: string): Promise<SettlementPeriod> {
    
    checkId([settlementPeriodId]);
  
    const session = await this.shopAccountModel.db.startSession();
    session.startTransaction();

    try {
      // Находим расчетный период
      const period = await this.settlementPeriodModel
        .findById(settlementPeriodId)
        .populate('shopAccount') // Загружаем информацию о магазине для получения ID продавца
        .session(session);

      if (!period) {
        throw new NotFoundException('Расчетный период не найден');
      }

      // Проверяем, что период в статусе PENDING_APPROVAL
      if (period.status !== SettlementPeriodStatus.PENDING_APPROVAL) {
        throw new BadRequestException(`Нельзя одобрить период в статусе ${period.status}`);
      }

      // Находим аккаунт магазина
      const shopAccount = await this.shopAccountModel
        .findById(period.shopAccount)
        .session(session);

      if (!shopAccount) throw new NotFoundException('Аккаунт магазина не найден');

      // Обновляем статус периода и добавляем комментарий админа
      period.status = SettlementPeriodStatus.RELEASED;
      period.internalComment = comment || '';
      period.releasedAt = new Date();
      
      // Обновляем статистические показатели счёта магазина
      // Здесь учитываем комиссию маркетплейса
      shopAccount.totalCommissions += period.amounts.commissions;
      shopAccount.lifetimeEarnings += period.amounts.total || 0;
      shopAccount.totalPenalties += period.amounts.penalties || 0;
      
      // Сохраняем изменения в базе
      await period.save({ session });
      await shopAccount.save({ session });

      // Завершаем транзакцию в MongoDB
      await session.commitTransaction();
      session.endSession();
      
      // После успешного сохранения в MongoDB, перечисляем средства на счет продавца (SellerAccount)
      // Этот вызов происходит вне транзакции MongoDB, так как работает с другой коллекцией
      try {
        // Получаем ID продавца из аккаунта магазина (через поле sellerAccount)
        // Это может быть ID SellerAccount или полный документ SellerAccount в зависимости от популяции
        const sellerAccountId = shopAccount.sellerAccount?.toString();

        if (sellerAccountId) {
          // Используем totalAmount вместо period.amounts.total
          // await this.sellerAccountService.addFundsFromSettlementPeriod(
          //   sellerAccountId, 
          //   period.totalAmount, 
          //   settlementPeriodId
          // );
        } else {
          // Логируем ошибку, но не прерываем выполнение, так как основная транзакция уже завершена
          console.error(`Не удалось перевести средства: не найден ID аккаунта продавца для магазина ${shopAccount._id}`);
        }
      } catch (transferError) {
        // Логируем ошибку, но не прерываем выполнение, так как основная транзакция уже завершена
        console.error('Ошибка при переводе средств на счет продавца:', transferError);
      }
      
      return period;
    } catch (error) {
      // При ошибке откатываем транзакцию MongoDB
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }



  // ====================================================
  // SETTLEMENT PERIOD TRANSACTION
  // ====================================================
  /**
   * Получение списка транзакций магазинов для администратора
   * @param settlementPeriodId - ID расчетного периода
   * @param filterQuery - Параметры фильтрации транзакций с расширенными возможностями для админа
   * @param paginationQuery - Параметры пагинации (страница, размер страницы)
   * @returns Пагинированный список транзакций с метаданными, преобразованный для администратора
   */
  async getSettlementPeriodTransactions(
    settlementPeriodId:string,
    filterQuery?: SettlementPeriodTransactionFilterQueryDto, 
    paginationQuery?: PaginationQueryDto
  ): Promise<{transactions: SettlementPeriodTransaction[], pagination: PaginationMetaDto}> {
    
    checkId([settlementPeriodId]);
    
    // Формируем базовый запрос
    const query = this.settlementPeriodTransactionModel.find({settlementPeriod: new Types.ObjectId(settlementPeriodId)});
    
    // Добавляем фильтры если они указаны
    if (filterQuery) {
      if (filterQuery.type) query.where('type').equals(filterQuery.type);
      if (filterQuery.status) query.where('status').equals(filterQuery.status);
      if (filterQuery.fromDate) query.where('createdAt').gte(filterQuery.fromDate.getTime());
      if (filterQuery.toDate) query.where('createdAt').lte(filterQuery.toDate.getTime());
    }
    
    const { page = 1, pageSize = 10 } = paginationQuery || {};
    const skip = (page - 1) * pageSize;
    
    // Сортировка по дате создания (от новых к старым)
    query.sort({ createdAt: -1 });
    
    // Получаем общее количество записей для пагинации
    const totalItems = await this.settlementPeriodTransactionModel.countDocuments(query.getFilter());
    
    // Выполняем запрос с пагинацией и преобразуем в простые объекты
    const transactions = await query.skip(skip).limit(pageSize).lean({ virtuals: true }).exec();
    
    // Формируем метаданные пагинации
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = {totalItems, totalPages, currentPage: page, pageSize};
    
    return { transactions, pagination };
  }


  /**
   * Получение списка транзакций магазинов для администратора
   * @param settlementPeriodTransactionId - ID транзакции
   * @returns Список транзакций
   */
  async getSettlementPeriodTransaction(settlementPeriodTransactionId: string): Promise<SettlementPeriodTransaction> {
    checkId([settlementPeriodTransactionId]);
    const foundSettlementPeriod = await this.settlementPeriodTransactionModel.findOne({ _id: new Types.ObjectId(settlementPeriodTransactionId) }).exec();
    if (!foundSettlementPeriod) throw new NotFoundException('Указанный расчетный период не найден');
    
    return foundSettlementPeriod;
  }


  /**
   * Создание транзакции для расчетного периода
   * @param createSettlementPeriodTransactionDto - DTO для создания транзакции
   * @param session - Сессия для транзакции
   * @returns Созданная транзакция
   */
  async createSettlementPeriodTransaction(
    createSettlementPeriodTransactionDto: CreateSettlementPeriodTransactionDto,
    session?: ClientSession
  ): Promise<SettlementPeriodTransaction> {
    const { shopAccountId, settlementPeriodId } = createSettlementPeriodTransactionDto;
  
    let foundShopAccount: ShopAccount | null = null;
    let foundSettlementPeriod: SettlementPeriod | null = null;
  
    // Определяем приоритет поиска
    if (settlementPeriodId) {
      checkId([settlementPeriodId]);
      foundSettlementPeriod = await this.settlementPeriodModel.findById(settlementPeriodId).exec();
      if (!foundSettlementPeriod) throw new NotFoundException('Указанный расчетный период не найден');
  
      // Если не передан shopAccountId — берем из периода
      if (shopAccountId) {
        if (foundSettlementPeriod.shopAccount.toString() !== shopAccountId) throw new BadRequestException('Расчетный период не принадлежит указанному аккаунту магазина');
      }
      foundShopAccount = await this.shopAccountModel.findById(foundSettlementPeriod.shopAccount).exec();
      if (!foundShopAccount) throw new NotFoundException('Аккаунт магазина не найден');
    } 
    else if (shopAccountId) {
      checkId([shopAccountId]);

      foundShopAccount = await this.shopAccountModel.findById(new Types.ObjectId(shopAccountId)).exec();
      if (!foundShopAccount) throw new NotFoundException('Аккаунт магазина не найден');
      // Находим активный период
      foundSettlementPeriod = await this.settlementPeriodModel.findOne({ shopAccount: new Types.ObjectId(shopAccountId), status: SettlementPeriodStatus.ACTIVE }).exec();
      if (!foundSettlementPeriod) throw new NotFoundException('Активный расчетный период не найден');
    }
    else throw new BadRequestException('Необходимо указать либо shopAccountId, либо settlementPeriodId');
  
    // Проверка на статус периода
    if (foundSettlementPeriod.status === SettlementPeriodStatus.RELEASED) throw new BadRequestException('Нельзя создавать транзакции для завершенного расчетного периода');
  
    if (
      foundSettlementPeriod.status === SettlementPeriodStatus.PENDING_APPROVAL &&
      ![
        SettlementPeriodTransactionType.CORRECTION_IN,
        SettlementPeriodTransactionType.CORRECTION_OUT,
      ].includes(createSettlementPeriodTransactionDto.type)
    ) {
      throw new BadRequestException('В периоде на утверждении можно создавать только корректировки');
    }
  
    // Определяем направление транзакции
    let direction: SettlementPeriodTransactionDirection;
    if (
      [
        SettlementPeriodTransactionType.ORDER_INCOME,
        SettlementPeriodTransactionType.BONUS,
        SettlementPeriodTransactionType.CORRECTION_IN,
      ].includes(createSettlementPeriodTransactionDto.type)
    ) {
      direction = SettlementPeriodTransactionDirection.CREDIT;
    } else {
      direction = SettlementPeriodTransactionDirection.DEBIT;
    }


    if (createSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId) {
      const foundSettlementPeriodTransaction = await this.settlementPeriodTransactionModel.findById(createSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId).exec();
      if (!foundSettlementPeriodTransaction) throw new NotFoundException('Указанный расчетный период транзакции не найден');
    }

    // Создаем транзакцию
    const createdSettlementPeriodTransaction = new this.settlementPeriodTransactionModel({
      shopAccount: foundShopAccount._id,
      settlementPeriod: foundSettlementPeriod._id,
      type: createSettlementPeriodTransactionDto.type,
      status: createSettlementPeriodTransactionDto.status || SettlementPeriodTransactionStatus.PENDING,
      amount: createSettlementPeriodTransactionDto.amount,
      direction,
      internalComment: createSettlementPeriodTransactionDto.internalComment || undefined,
      description: createSettlementPeriodTransactionDto.description,
      externalTransactionId: createSettlementPeriodTransactionDto.externalTransactionId || undefined,
      references: {
        orderId: createSettlementPeriodTransactionDto.referenceOrderId || undefined,
        penaltyId: createSettlementPeriodTransactionDto.referencePenaltyId || undefined,
        paymentId: createSettlementPeriodTransactionDto.referencePaymentId || undefined,
        refundId: createSettlementPeriodTransactionDto.referenceRefundId || undefined,
        bonusId: createSettlementPeriodTransactionDto.referenceBonusId || undefined,
        payoutId: createSettlementPeriodTransactionDto.referencePayoutId || undefined,
        deliveryPaymentId: createSettlementPeriodTransactionDto.referenceDeliveryPaymentId || undefined,
        settlementPeriodTransactionId: createSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId || undefined,
      },
    });
  
    if (session) return await createdSettlementPeriodTransaction.save({ session });
    return await createdSettlementPeriodTransaction.save();
  }


  async updateSettlementPeriodTransaction(
    settlementPeriodTransactionId: string,
    updateSettlementPeriodTransactionDto: UpdateSettlementPeriodTransactionDto,
    session?: ClientSession
  ): Promise<SettlementPeriodTransaction> {
    checkId([settlementPeriodTransactionId]);
    
    if (updateSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId) {
      const foundSettlementPeriodTransaction = await this.settlementPeriodTransactionModel.findById(updateSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId).exec();
      if (!foundSettlementPeriodTransaction) throw new NotFoundException('Указанный расчетный период не найден');
    }
    // Формируем обновляемые поля
    const updateData = {
      status: updateSettlementPeriodTransactionDto.status || undefined,
      description: updateSettlementPeriodTransactionDto.description || undefined,
      internalComment: updateSettlementPeriodTransactionDto.internalComment || undefined,
      references: {
        orderId: updateSettlementPeriodTransactionDto.referenceOrderId || undefined,
        penaltyId: updateSettlementPeriodTransactionDto.referencePenaltyId || undefined,
        paymentId: updateSettlementPeriodTransactionDto.referencePaymentId || undefined,
        refundId: updateSettlementPeriodTransactionDto.referenceRefundId || undefined,
        bonusId: updateSettlementPeriodTransactionDto.referenceBonusId || undefined,
        payoutId: updateSettlementPeriodTransactionDto.referencePayoutId || undefined,
        deliveryPaymentId: updateSettlementPeriodTransactionDto.referenceDeliveryPaymentId || undefined,
        settlementPeriodTransactionId: updateSettlementPeriodTransactionDto.referenceSettlementPeriodTransactionId || undefined,
      },
    };
    
    // Создаем опции запроса, добавляя сессию если она передана
    const options = { new: true };
    if (session) Object.assign(options, { session });
    
    // Выполняем запрос с учетом опций (включая сессию, если она есть)
    const updatedSettlementPeriodTransaction = await this.settlementPeriodTransactionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(settlementPeriodTransactionId) },
      updateData,
      options
    ).exec();
    
    if (!updatedSettlementPeriodTransaction) throw new NotFoundException('Транзакция расчетного периода не найдена');
    
    return updatedSettlementPeriodTransaction;
  }
}