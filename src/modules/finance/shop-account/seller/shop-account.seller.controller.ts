import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { 
  SettlementPeriodFilterQueryDto,
  SettlementPeriodTransactionFilterQueryDto,
} from './shop-account.seller.request.dto';
import { 
  SettlementPeriodResponseDto, 
  SettlementPeriodTransactionResponseDto, 
  ShopAccountResponseDto
} from './shop-account.seller.response.dto';
import { ShopOwnershipGuard } from 'src/common/guards/shop-ownership.guard';
import { ShopAccountSellerService } from './shop-account.seller.service';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/shops/:shopId/account')
@UseGuards(JwtAuthGuard, TypeGuard, ShopOwnershipGuard)
@UserType('seller')
export class ShopAccountSellerController {
  constructor(private readonly shopAccountSellerService: ShopAccountSellerService) {}

  @ApiOperation({summary: 'Получить аккаунт магазина'})
  @Get('/')
  getShopAccount(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountSellerService.getShopAccount(authedSeller, shopId);
  }


  @ApiOperation({summary: 'Получить все периоды аккаунта магазина'})
  @Get('/settlement-periods')
  getShopSettlementPeriods(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() filterQuery?: SettlementPeriodFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    return this.shopAccountSellerService.getShopSettlementPeriods(authedSeller, shopId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить список транзакций для данного периода'})
  @Get('/settlement-periods/:settlementPeriodId/transactions')
  getSettlementPeriodTransactions(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Query() paginationQuery?: PaginationQueryDto,
    @Query() filterQuery?: SettlementPeriodTransactionFilterQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {
    return this.shopAccountSellerService.getSettlementPeriodTransactions(
      authedSeller, shopId, settlementPeriodId, filterQuery, paginationQuery
    );
  }

  @ApiOperation({summary: 'Получить транзакцию'})
  @Get('/settlement-periods/:settlementPeriodId/transactions/:transactionId')
  getSettlementPeriodTransaction(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Param('transactionId') transactionId: string,
  ): Promise<SettlementPeriodTransactionResponseDto> {
    return this.shopAccountSellerService.getSettlementPeriodTransaction(authedSeller, shopId, settlementPeriodId, transactionId);
  }
}
