import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SellerAccount } from './schemas/seller-account.schema';
import { WithdrawalRequest, WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';
import { CreateWithdrawalRequestDto, UpdateBankDetailsDto, UpdateWithdrawalRequestDto, WithdrawalRequestFilterQueryDto, WithdrawalRequestStatusFilter } from './seller-account.request.dtos';
import { PaginationQueryDto, PaginationMetaDto } from 'src/common/dtos';
import { checkId } from 'src/common/utils';

@Injectable()
export class SellerAccountService {

  constructor(
    @InjectModel('SellerAccount') private sellerAccountModel: Model<SellerAccount>,
    @InjectModel('WithdrawalRequest') private withdrawalRequestModel: Model<WithdrawalRequest>,
  ) {}

  /**
   * Обновление банковских реквизитов продавца
   * @param sellerAccountId - ID продавца
   * @param updateBankDetailsDto - DTO для обновления банковских реквизитов
   * @returns Обновленный аккаунт продавца
   */
  async updateBankDetails(
    sellerAccountId: string,
    updateBankDetailsDto: UpdateBankDetailsDto,
  ): Promise<SellerAccount> {
    checkId([sellerAccountId]);
    const updatedSellerAccount = await this.sellerAccountModel.findByIdAndUpdate(new Types.ObjectId(sellerAccountId), updateBankDetailsDto, { new: true }).exec();
    if (!updatedSellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    return updatedSellerAccount;
  }


  /**
   * Получение аккаунта продавца
   * @param sellerAccountId - ID продавца
   * @returns Аккаунт продавца
   */
  async getSellerAccount(sellerAccountId: string): Promise<SellerAccount> {
    checkId([sellerAccountId]);
    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(sellerAccountId)}).lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
    return sellerAccount;
  }


  /**
   * Получение списка заявок на вывод средств с пагинацией и фильтрацией
   * @param filterQuery - Параметры фильтрации
   * @param paginationQuery - Параметры пагинации
   * @returns Объект с массивом заявок и метаданными пагинации
   */
  async getWithdrawalRequests(
    filterQuery?: WithdrawalRequestFilterQueryDto,
    paginationQuery?: PaginationQueryDto,
  ): Promise<{requests: WithdrawalRequest[], pagination: PaginationMetaDto}> {
    const { status, ofSellerId } = filterQuery || {};
    
    const query = this.withdrawalRequestModel.find();
    
    if (ofSellerId) {
      checkId([ofSellerId]);
      const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(ofSellerId)}).select('_id').lean({ virtuals: true }).exec();
      if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');
      query.where('sellerAccount').equals(sellerAccount._id);
    }
    
    if (status) {
      if (status === WithdrawalRequestStatusFilter.ACTIVE) {
        query.where('status').in([
          WithdrawalRequestStatus.PENDING,
          WithdrawalRequestStatus.PROCESSING
        ]);
      } else if (status === WithdrawalRequestStatusFilter.INACTIVE) {
        query.where('status').in([
          WithdrawalRequestStatus.COMPLETED,
          WithdrawalRequestStatus.REJECTED,
          WithdrawalRequestStatus.FAILED
        ]);
      }
    }
    const { page = 1, pageSize = 10 } = paginationQuery || {};
    const skip = (page - 1) * pageSize;
    query.sort({ createdAt: -1 });
    const totalItems = await this.withdrawalRequestModel.countDocuments(query.getFilter());
    const requests = await query.skip(skip).limit(pageSize).lean({ virtuals: true }).exec();

    const totalPages = Math.ceil(totalItems / pageSize);
    
    return {
      requests,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize
      }
    };
  }


  /**
   * Получение заявки на вывод средств по ID
   * @param withdrawalRequestId - ID заявки на вывод средств
   * @returns Заявка на вывод средств
   */
  async getWithdrawalRequest( withdrawalRequestId: string ): Promise<WithdrawalRequest> {
    checkId([withdrawalRequestId]);
    const withdrawalRequest = await this.withdrawalRequestModel.findById(withdrawalRequestId).lean({ virtuals: true }).exec();
    if (!withdrawalRequest) throw new NotFoundException('Заявка на вывод средств не найдена');
    return withdrawalRequest;
  }


  /**
   * Создание заявки на вывод средств
   * @param fromSellerId - ID продавца
   * @param createWithdrawalRequestDto - DTO для создания заявки на вывод средств
   * @returns Созданная заявка на вывод средств
   */
  async createWithdrawalRequest(
    fromSellerId: string,
    createWithdrawalRequestDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {

    checkId([fromSellerId]);

    const sellerAccount = await this.sellerAccountModel.findOne({seller: new Types.ObjectId(fromSellerId)}).lean({ virtuals: true }).exec();
    if (!sellerAccount) throw new NotFoundException('Аккаунт продавца не найден');

    if (sellerAccount.balance < createWithdrawalRequestDto.amount) throw new BadRequestException('Недостаточно средств на счете');

    const sellerAccountBankDetails = sellerAccount.bankDetails;
    if (!sellerAccountBankDetails) throw new NotFoundException('Банковские реквизиты продавца не найдены');

    const withdrawalRequest = await this.withdrawalRequestModel.create({
      amount: createWithdrawalRequestDto.amount,
      sellerAccount: new Types.ObjectId(sellerAccount._id),
      bankDetails: sellerAccountBankDetails,
    });
    return withdrawalRequest;
  }

  
  /**
   * Обновление заявки на вывод средств
   * @param withdrawalRequestId - ID заявки на вывод средств
   * @param updateWithdrawalRequestDto - DTO для обновления заявки на вывод средств
   * @returns Обновленная заявка на вывод средств
   */
  async updateWithdrawalRequest(
    withdrawalRequestId: string,
    updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ): Promise<WithdrawalRequest> {
    checkId([withdrawalRequestId]);

    const updatedWithdrawalRequest = await this.withdrawalRequestModel.findByIdAndUpdate(
      new Types.ObjectId(withdrawalRequestId), 
      updateWithdrawalRequestDto, 
      { new: true }
    ).lean({ virtuals: true }).exec();
    
    if (!updatedWithdrawalRequest) throw new NotFoundException('Заявка на вывод средств не найдена');
    
    return updatedWithdrawalRequest;
  }


}
