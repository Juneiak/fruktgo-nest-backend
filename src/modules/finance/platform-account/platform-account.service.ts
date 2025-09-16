import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { PlatformAccount } from './schemas/platform-account.schema';
import { PlatformAccountTransaction, PlatformAccountTransactionDirection, PlatformAccountTransactionStatus, PlatformAccountTransactionType } from './schemas/platform-account-transaction.schema';
import { PaginationQueryDto, PaginationMetaDto } from 'src/common/dtos';
import { checkId } from 'src/common/utils';
import { CreatePlatformAccountTransactionDto, UpdatePlatformAccountTransactionDto } from './shared/platform-account.shared.request.dtos';


@Injectable()
export class PlatformAccountService {
  constructor(
    @InjectModel('PlatformAccount') private platformAccountModel: Model<PlatformAccount>,
    @InjectModel('PlatformAccountTransaction') private platformAccountTransactionModel: Model<PlatformAccountTransaction>,
  ) {}


  /**
   * Получение платформенного счета
   * @returns Платформенный счет
   */
  async getPlatformAccount(): Promise<PlatformAccount> {
    const platformAccount = await this.platformAccountModel.findOne().exec();
    if (!platformAccount) throw new NotFoundException('Platform account not found');
    return platformAccount;
  }


  /**
   * Получение транзакций платформенного счета
   * @param paginationQuery - Параметры пагинации
   * @returns Пагинированный список транзакций платформенного счета
   */
  async getPlatformAccountTransactions(paginationQuery?: PaginationQueryDto): Promise<{transactions: PlatformAccountTransaction[], pagination: PaginationMetaDto}> {
    // По умолчанию, если пагинация не передана
    const currentPage = paginationQuery?.page || 1;
    const pageSize = paginationQuery?.pageSize || 10;
    const skip = (currentPage - 1) * pageSize;
    
    // Получаем общее количество записей для метаданных пагинации
    const totalItems = await this.platformAccountTransactionModel.countDocuments().exec();
    
    // Получаем записи с учетом пагинации
    const transactions = await this.platformAccountTransactionModel.find()
      .sort({ createdAt: -1 }) // Сортируем по дате создания (новые сначала)
      .skip(skip)
      .limit(pageSize)
      .exec();
    
    // Формируем метаданные для пагинации
    const pagination = new PaginationMetaDto();
    pagination.currentPage = currentPage;
    pagination.pageSize = pageSize;
    pagination.totalItems = totalItems;
    pagination.totalPages = Math.ceil(totalItems / pageSize);
    
    return { transactions, pagination };
  }


  /**
   * Получение транзакции платформенного счета
   * @param platformAccountTransactionId - ID транзакции
   * @returns Транзакция платформенного счета
   */
  async getPlatformAccountTransaction(platformAccountTransactionId: string): Promise<PlatformAccountTransaction> {
    const platformAccountTransaction = await this.platformAccountTransactionModel.findById(platformAccountTransactionId).exec();
    if (!platformAccountTransaction) throw new NotFoundException('Platform account transaction not found');
    return platformAccountTransaction;
  }


  /**
   * Базовый метод для создания транзакции платформенного счета
   * Определяет направление транзакции (кредит/дебет) на основе типа
   * Проверяет наличие активного расчетного периода для магазина
   * @returns Сохраненная транзакция
   */
  async createPlatformAccountTransaction(
    createPlatformAccountTransactionDto: CreatePlatformAccountTransactionDto,
    session?: ClientSession
  ): Promise<PlatformAccountTransaction> {
    const platformAccount = await this.getPlatformAccount();

    if ([
      PlatformAccountTransactionType.SELLER_PAYOUT,
      PlatformAccountTransactionType.DELIVERY_PAYMENT,
      PlatformAccountTransactionType.REFUND_TO_CUSTOMER,
      PlatformAccountTransactionType.BONUS_TO_SELLER,
      PlatformAccountTransactionType.OPERATIONAL_EXPENSE,
      PlatformAccountTransactionType.CORRECTION_OUT
    ].includes(createPlatformAccountTransactionDto.type)) createPlatformAccountTransactionDto.direction = PlatformAccountTransactionDirection.DEBIT;
    else createPlatformAccountTransactionDto.direction = PlatformAccountTransactionDirection.CREDIT;
    
    if (createPlatformAccountTransactionDto.referencePlatformAccountTransactionId) {
      const transaction = await this.platformAccountTransactionModel.findById(createPlatformAccountTransactionDto.referencePlatformAccountTransactionId).exec();
      if (!transaction) throw new NotFoundException('Транзакция счета платформы не найдена');
    }
    const transaction = new this.platformAccountTransactionModel({
      platformAccount: platformAccount._id,
      type: createPlatformAccountTransactionDto.type,
      direction: createPlatformAccountTransactionDto.direction,
      status: createPlatformAccountTransactionDto.status || PlatformAccountTransactionStatus.PENDING,
      amount: Math.abs(createPlatformAccountTransactionDto.amount),
      description: createPlatformAccountTransactionDto.description || undefined,
      isManual: createPlatformAccountTransactionDto.isManual || false,
      internalComment: createPlatformAccountTransactionDto.internalComment || undefined,
      externalTransactionId: createPlatformAccountTransactionDto.externalTransactionId || undefined,
      references: {
        orderId: createPlatformAccountTransactionDto.referenceOrderId || undefined,
        customerId: createPlatformAccountTransactionDto.referenceCustomerId || undefined,
        employeeId: createPlatformAccountTransactionDto.referenceEmployeeId || undefined,
        sellerAccountId: createPlatformAccountTransactionDto.referenceSellerAccountId || undefined,
        shopAccountId: createPlatformAccountTransactionDto.referenceShopAccountId || undefined,
        paymentId: createPlatformAccountTransactionDto.referencePaymentId || undefined,
        refundId: createPlatformAccountTransactionDto.referenceRefundId || undefined,
        penaltyId: createPlatformAccountTransactionDto.referencePenaltyId || undefined,
        withdrawalRequestId: createPlatformAccountTransactionDto.referenceWithdrawalRequestId || undefined,
        deliveryPaymentId: createPlatformAccountTransactionDto.referenceDeliveryPaymentId || undefined,
        externalServiceId: createPlatformAccountTransactionDto.referenceExternalServiceId || undefined,
        platformAccountTransactionId: createPlatformAccountTransactionDto.referencePlatformAccountTransactionId || undefined,
      },
    });
    
    if (session) return await transaction.save({ session });
    return await transaction.save();
  }


  async updatePlatformAccountTransaction(
    platformAccountTransactionId: string,
    updatePlatformAccountTransactionDto: UpdatePlatformAccountTransactionDto,
    session?: ClientSession
  ): Promise<PlatformAccountTransaction> {
    checkId([platformAccountTransactionId]);
    
    if (updatePlatformAccountTransactionDto.referencePlatformAccountTransactionId) {
      const transaction = await this.platformAccountTransactionModel.findById(updatePlatformAccountTransactionDto.referencePlatformAccountTransactionId).exec();
      if (!transaction) throw new NotFoundException('Транзакция счета платформы не найдена');
    }
    // Формируем обновляемые поля
    const updateData = {
      status: updatePlatformAccountTransactionDto.status || undefined,
      description: updatePlatformAccountTransactionDto.description || undefined,
      internalComment: updatePlatformAccountTransactionDto.internalComment || undefined,
      references: {
        orderId: updatePlatformAccountTransactionDto.referenceOrderId || undefined,
        customerId: updatePlatformAccountTransactionDto.referenceCustomerId || undefined,
        employeeId: updatePlatformAccountTransactionDto.referenceEmployeeId || undefined,
        sellerAccountId: updatePlatformAccountTransactionDto.referenceSellerAccountId || undefined,
        shopAccountId: updatePlatformAccountTransactionDto.referenceShopAccountId || undefined,
        paymentId: updatePlatformAccountTransactionDto.referencePaymentId || undefined,
        refundId: updatePlatformAccountTransactionDto.referenceRefundId || undefined,
        penaltyId: updatePlatformAccountTransactionDto.referencePenaltyId || undefined,
        withdrawalRequestId: updatePlatformAccountTransactionDto.referenceWithdrawalRequestId || undefined,
        deliveryPaymentId: updatePlatformAccountTransactionDto.referenceDeliveryPaymentId || undefined,
        externalServiceId: updatePlatformAccountTransactionDto.referenceExternalServiceId || undefined,
        platformAccountTransactionId: updatePlatformAccountTransactionDto.referencePlatformAccountTransactionId || undefined,
      },
    };
    
    // Создаем опции запроса, добавляя сессию если она передана
    const options = { new: true };
    if (session) Object.assign(options, { session });
    
    // Выполняем запрос с учетом опций (включая сессию, если она есть)
    const updatedPlatformAccountTransaction = await this.platformAccountTransactionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(platformAccountTransactionId) },
      updateData,
      options
    ).exec();
    
    if (!updatedPlatformAccountTransaction) throw new NotFoundException('Транзакция платформенного счета не найдена');
    
    return updatedPlatformAccountTransaction;
  }

}
