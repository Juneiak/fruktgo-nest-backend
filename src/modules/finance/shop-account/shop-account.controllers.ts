import { Body, Controller, Get, Post, Query, Param, Put, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { 
  SettlementPeriodFilterQueryDto,
  SettlementPeriodTransactionFilterQueryDto,
  CreateCorrectionDto, 
  ApproveSettlementPeriodDto,
  UpdateShopAccountDto
} from './shop-account.request.dtos';
import { 
  SettlementPeriodResponseDto, 
  SettlementPeriodTransactionResponseDto, 
  ShopAccountResponseDto
} from './shop-account.response.dtos';

import {
  ShopAccountServiceForAdmin, 
  ShopAccountServiceForSeller 
} from './shop-account.role-services';
import { ShopOwnershipGuard } from 'src/common/guards/shop-ownership.guard';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/shops/:shopId/account')
@UseGuards(JwtAuthGuard, TypeGuard, ShopOwnershipGuard)
@UserType('seller')
export class ShopAccountControllerForSeller {
  constructor(private readonly shopAccountServiceForSeller: ShopAccountServiceForSeller) {}

  @ApiOperation({summary: 'Получить аккаунт магазина'})
  @ApiOkResponse({type: ShopAccountResponseDto})
  @Get('/')
  getShopAccount(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountServiceForSeller.getShopAccount(authedSeller, shopId);
  }


  @ApiOperation({summary: 'Получить все периоды аккаунта магазина'})
  @ApiOkResponse({type: SettlementPeriodResponseDto, isArray: true})
  @Get('/settlement-periods')
  getShopSettlementPeriods(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() filterQuery?: SettlementPeriodFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    return this.shopAccountServiceForSeller.getShopSettlementPeriods(authedSeller, shopId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить список транзакций для данного периода'})
  @ApiOkResponse({type: SettlementPeriodTransactionResponseDto, isArray: true})
  @Get('/settlement-periods/:settlementPeriodId/transactions')
  getSettlementPeriodTransactions(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Query() paginationQuery?: PaginationQueryDto,
    @Query() filterQuery?: SettlementPeriodTransactionFilterQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {
    return this.shopAccountServiceForSeller.getSettlementPeriodTransactions(
      authedSeller, shopId, settlementPeriodId, filterQuery, paginationQuery
    );
  }

  @ApiOperation({summary: 'Получить транзакцию'})
  @ApiOkResponse({type: SettlementPeriodTransactionResponseDto})
  @Get('/settlement-periods/:settlementPeriodId/transactions/:transactionId')
  getSettlementPeriodTransaction(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Param('transactionId') transactionId: string,
  ): Promise<SettlementPeriodTransactionResponseDto> {
    return this.shopAccountServiceForSeller.getSettlementPeriodTransaction(authedSeller, shopId, settlementPeriodId, transactionId);
  }
}




@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shops/:shopId/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShopAccountControllerForAdmin {
  constructor(private readonly shopAccountServiceForAdmin: ShopAccountServiceForAdmin) {}

  @ApiOperation({summary: 'Получить аккаунт магазина'})
  @ApiOkResponse({type: ShopAccountResponseDto})
  @Get('/')
  getShopAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountServiceForAdmin.getShopAccount(authedAdmin, shopId);
  }

  @ApiOperation({summary: 'Обновить аккаунт магазина'})
  @ApiOkResponse({type: ShopAccountResponseDto})
  @Patch('/')
  updateShopAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() updateShopAccountDto: UpdateShopAccountDto,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountServiceForAdmin.updateShopAccount(authedAdmin, shopId, updateShopAccountDto);
  }


  @ApiOperation({summary: 'Получить периоды аккаунта магазина'})
  @ApiOkResponse({type: SettlementPeriodResponseDto, isArray: true})
  @Get('/settlement-periods')
  getSettlementPeriods(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() filterQuery?: SettlementPeriodFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    return this.shopAccountServiceForAdmin.getShopSettlementPeriods(authedAdmin, shopId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить список транзакций для администратора'})
  @ApiOkResponse({type: SettlementPeriodTransactionResponseDto, isArray: true})
  @Get('/settlement-periods/:settlementPeriodId/transactions')
  getTransactions(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Query() paginationQuery?: PaginationQueryDto,
    @Query() filterQuery?: SettlementPeriodTransactionFilterQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {
    return this.shopAccountServiceForAdmin.getSettlementPeriodTransactions(authedAdmin, settlementPeriodId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Создать корректировку баланса продавца'})
  @ApiOkResponse({type: SettlementPeriodTransactionResponseDto})
  @Post('/settlement-periods/:settlementPeriodId/transactions')
  createCorrection(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Body() correctionDto: CreateCorrectionDto
  ): Promise<SettlementPeriodTransactionResponseDto> {
    return this.shopAccountServiceForAdmin.createCorrection(authedAdmin, settlementPeriodId, correctionDto);
  }

  @ApiOperation({summary: 'Закрыть период'})
  @ApiOkResponse({type: SettlementPeriodResponseDto})
  @Post('/settlement-periods/:settlementPeriodId/close')
  closeSettlementPeriod(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
  ): Promise<SettlementPeriodResponseDto> {
    return this.shopAccountServiceForAdmin.closeSettlementPeriod(authedAdmin, settlementPeriodId);
  }


  @ApiOperation({summary: 'Потвердить закрытие периода'})
  @ApiOkResponse({type: SettlementPeriodResponseDto})
  @Post('/settlement-periods/:settlementPeriodId/approve')
  approveSettlementPeriod(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Body() approveDto: ApproveSettlementPeriodDto
  ): Promise<SettlementPeriodResponseDto> {
    return this.shopAccountServiceForAdmin.approveSettlementPeriod(authedAdmin, settlementPeriodId, approveDto);
  }
}
