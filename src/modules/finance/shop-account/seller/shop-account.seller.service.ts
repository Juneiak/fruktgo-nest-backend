import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { 
  SettlementPeriodTransactionFilterQueryDto,
  SettlementPeriodFilterQueryDto,
 } from './shop-account.seller.request.dto';
import { SettlementPeriodResponseDto, SettlementPeriodTransactionResponseDto } from './shop-account.seller.response.dto';
import { ShopAccountService } from '../shop-account.service';
import { ShopAccountResponseDto } from './shop-account.seller.response.dto';


@Injectable()
export class ShopAccountSellerService {
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
