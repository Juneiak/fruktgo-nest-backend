import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';

import { 
  SettlementPeriodTransactionFilterQueryDto,
  CreateCorrectionDto,
  SettlementPeriodFilterQueryDto,
  UpdateShopAccountDto,
  ApproveSettlementPeriodDto
 } from './shop-account.request.dtos';
import { SettlementPeriodResponseDto, SettlementPeriodTransactionResponseDto } from './shop-account.response.dtos';
import { 
  SettlementPeriodTransactionType, 
  SettlementPeriodTransactionStatus, 
  SettlementPeriodTransactionDirection 
} from './schemas/settlement-period-transaction.schema';
import { ShopAccountService } from './shop-account.service';
import { ShopAccountResponseDto } from './shop-account.response.dtos';


@Injectable()
export class ShopAccountServiceForSeller {
  constructor(
    private shopAccountService: ShopAccountService,
  ) {}

  // ====================================================
  // SHOP ACCOUNT
  // ====================================================
  async getShopAccount(authedSeller: AuthenticatedUser, shopId:string): Promise<ShopAccountResponseDto> {
    const shopAccount = await this.shopAccountService.getShopAccount(shopId);
    return plainToInstance(ShopAccountResponseDto, shopAccount, { groups: ['seller'], excludeExtraneousValues: true });
  }


  // ====================================================
  // SETTLEMENT PERIOD
  // ====================================================
  async getShopSettlementPeriods(
    authedSeller: AuthenticatedUser,
    shopId:string,
    filterQuery?: SettlementPeriodFilterQueryDto,
    paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    const {periods, pagination} = await this.shopAccountService.getShopSettlementPeriods(shopId, filterQuery, paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      SettlementPeriodResponseDto,
      periods,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
    return { items, pagination };
  };


  async getSettlementPeriod(authedSeller: AuthenticatedUser, shopId:string, settlementPeriodId: string): Promise<SettlementPeriodResponseDto> {
    await this.shopAccountService.validateSettlementPeriodOwnershipToShop(shopId, settlementPeriodId);
    
    const settlementPeriod = await this.shopAccountService.getShopSettlementPeriod(settlementPeriodId);
    
    return plainToInstance(SettlementPeriodResponseDto, settlementPeriod, { groups: ['seller'], excludeExtraneousValues: true });
  }



  // ====================================================
  // SETTLEMENT PERIOD TRANSACTIONS
  // ====================================================
  async getSettlementPeriodTransactions(
    authedSeller: AuthenticatedUser,
    shopId:string,
    settlementPeriodId: string,
    filterQuery?: SettlementPeriodTransactionFilterQueryDto, 
    paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {
    await this.shopAccountService.validateSettlementPeriodOwnershipToShop(shopId, settlementPeriodId);
    
    const {transactions, pagination} = await this.shopAccountService.getSettlementPeriodTransactions(
      settlementPeriodId,
      filterQuery,
      paginationQuery
    );
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      SettlementPeriodTransactionResponseDto,
      transactions,
      { groups: ['seller'], excludeExtraneousValues: true }
    );
    
    return { items, pagination };
  }

  async getSettlementPeriodTransaction(
    authedSeller: AuthenticatedUser,
    shopId:string,
    settlementPeriodId: string,
    transactionId: string
  ): Promise<SettlementPeriodTransactionResponseDto> {
    await this.shopAccountService.validateSettlementPeriodOwnershipToShop(shopId, settlementPeriodId);
    
    const transaction = await this.shopAccountService.getSettlementPeriodTransaction(transactionId);
    if (transaction.settlementPeriod.toString() !== settlementPeriodId) throw new ForbiddenException('Транзакция не принадлежит данному периоду');
    
    return plainToInstance(SettlementPeriodTransactionResponseDto, transaction, { groups: ['seller'], excludeExtraneousValues: true });
  }



}




@Injectable()
export class ShopAccountServiceForAdmin {
  constructor(
    private shopAccountService: ShopAccountService,
  ) {}

  // ====================================================
  // SHOP ACCOUNT
  // ====================================================
  async getShopAccount(authedAdmin: AuthenticatedUser, shopId:string): Promise<ShopAccountResponseDto> {
    const shopAccount = await this.shopAccountService.getShopAccount(shopId);
    return plainToInstance(ShopAccountResponseDto, shopAccount, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async updateShopAccount(authedAdmin: AuthenticatedUser, shopId:string, updateDto: UpdateShopAccountDto): Promise<ShopAccountResponseDto> {
    const shopAccount = await this.shopAccountService.updateShopAccount(shopId, updateDto);
    return plainToInstance(ShopAccountResponseDto, shopAccount, { groups: ['admin'], excludeExtraneousValues: true });
  }



  // ====================================================
  // SETTLEMENT PERIOD
  // ====================================================
  async getShopSettlementPeriods(
    authedAdmin: AuthenticatedUser,
    shopId:string,
    filterQuery?: SettlementPeriodFilterQueryDto,
    paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    const {periods, pagination} = await this.shopAccountService.getShopSettlementPeriods(shopId,filterQuery,paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      SettlementPeriodResponseDto,
      periods,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
    return { items, pagination };
  }


  async getSettlementPeriod(
    authedAdmin: AuthenticatedUser,
    settlementPeriodId: string
  ): Promise<SettlementPeriodResponseDto> {
    const settlementPeriod = await this.shopAccountService.getShopSettlementPeriod(settlementPeriodId);
    return plainToInstance(SettlementPeriodResponseDto, settlementPeriod, { groups: ['admin'], excludeExtraneousValues: true });
  }


  async closeSettlementPeriod(
    authedAdmin: AuthenticatedUser,
    settlementPeriodId: string,
  ): Promise<SettlementPeriodResponseDto> {
    const period = await this.shopAccountService.closeSettlementPeriod(settlementPeriodId);

    return plainToInstance(
      SettlementPeriodResponseDto,
      period.toObject({ virtuals: true }),
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }


  async approveSettlementPeriod(
    authedAdmin: AuthenticatedUser, 
    settlementPeriodId: string, 
    approveDto: ApproveSettlementPeriodDto
  ): Promise<SettlementPeriodResponseDto> {
    const period = await this.shopAccountService.approveSettlementPeriod(settlementPeriodId, approveDto.comment);

    return plainToInstance(
      SettlementPeriodResponseDto,
      period.toObject({ virtuals: true }),
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }



  // ====================================================
  // SETTLEMENT PERIOD TRANSACTIONS
  // ====================================================
  async getSettlementPeriodTransactions(
    authedAdmin: AuthenticatedUser,
    settlementPeriodId:string,
    filterQuery?: SettlementPeriodTransactionFilterQueryDto, 
    paginationQuery?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {

    const {transactions, pagination} = await this.shopAccountService.getSettlementPeriodTransactions(settlementPeriodId,filterQuery,paginationQuery);
    
    // Преобразуем документы в DTO
    const items = plainToInstance(
      SettlementPeriodTransactionResponseDto,
      transactions,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
    return { items, pagination };
  }
  

  async getSettlementPeriodTransaction(
    authedAdmin: AuthenticatedUser,
    transactionId:string
  ): Promise<SettlementPeriodTransactionResponseDto> {
    const transaction = await this.shopAccountService.getSettlementPeriodTransaction(transactionId);
    return plainToInstance(SettlementPeriodTransactionResponseDto, transaction, { groups: ['admin'], excludeExtraneousValues: true });
  }
  

  async createCorrection(
    authedAdmin: AuthenticatedUser, 
    settlementPeriodId: string,
    correctionDto: CreateCorrectionDto
  ): Promise<SettlementPeriodTransactionResponseDto> {

    // Проверяем, что тип корректировки валидный
    if (
      ![SettlementPeriodTransactionType.CORRECTION_IN, SettlementPeriodTransactionType.CORRECTION_OUT].includes(correctionDto.type)
    ) throw new BadRequestException('Неверный тип корректировки');

    if (correctionDto.referenceSettlementPeriodTransactionId) {
      const foundSettlementPeriodTransaction = await this.shopAccountService.getSettlementPeriodTransaction(correctionDto.referenceSettlementPeriodTransactionId);
      if (!foundSettlementPeriodTransaction) throw new NotFoundException('Указанный расчетный период транзакции не найден');
      if (foundSettlementPeriodTransaction.settlementPeriod.toString() !== settlementPeriodId) throw new ForbiddenException('Транзакция не принадлежит данному периоду');
    }

    // Используем метод из shopAccountService для создания транзакции
    const savedTransaction = await this.shopAccountService.createSettlementPeriodTransaction({
      settlementPeriodId,
      type: correctionDto.type,
      amount: correctionDto.amount,
      direction: correctionDto.type === SettlementPeriodTransactionType.CORRECTION_IN ? 
        SettlementPeriodTransactionDirection.CREDIT : 
        SettlementPeriodTransactionDirection.DEBIT,
      description: correctionDto.description,
      internalComment: correctionDto.internalComment,
      referenceOrderId: correctionDto.referenceOrderId,
      referencePenaltyId: correctionDto.referencePenaltyId,
      referencePaymentId: correctionDto.referencePaymentId,
      referenceRefundId: correctionDto.referenceRefundId,
      referenceBonusId: correctionDto.referenceBonusId,
      referencePayoutId: correctionDto.referencePayoutId,
      referenceDeliveryPaymentId: correctionDto.referenceDeliveryPaymentId,
      referenceSettlementPeriodTransactionId: correctionDto.referenceSettlementPeriodTransactionId,
    });

    
    // Преобразуем сохраненную транзакцию в DTO
    return plainToInstance(
      SettlementPeriodTransactionResponseDto,
      savedTransaction,
      { groups: ['admin'], excludeExtraneousValues: true }
    );
  }




}