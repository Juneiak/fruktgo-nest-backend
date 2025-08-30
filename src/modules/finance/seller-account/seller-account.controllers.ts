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
  SellerAccountServiceForAdmin, 
  SellerAccountServiceForSeller 
} from './seller-account.role-services';
import { SellerAccountResponseDto, WithdrawalRequestResponseDto } from './seller-account.response.dtos';
import {
  UpdateBankDetailsDto,
  CreateWithdrawalRequestDto,
  WithdrawalRequestFilterQueryDto,
} from './seller-account.request.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerAccountControllerForSeller {
  constructor(private readonly sellerAccountServiceForSeller: SellerAccountServiceForSeller) {}

  @ApiOperation({summary: 'Получить аккаунт продовца'})
  @Get('/')
  getSellerAccount(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountServiceForSeller.getSellerAccount(authedSeller);
  }


  @ApiOperation({summary: 'Обновить банковские реквизиты'})
  @Patch('/')
  updateBankDetails(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() bankDetailsDto: UpdateBankDetailsDto,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountServiceForSeller.updateBankDetails(authedSeller, bankDetailsDto);
  }


  @ApiOperation({summary: 'создать запрос на вывод средств'})
  @Post('/withdrawal-request')
  createWithdrawalRequest(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountServiceForSeller.createWithdrawalRequest(authedSeller, createWithdrawalRequestDto);
  }


  @ApiOperation({summary: 'Получить все запросы на вывод средств'})
  @Get('/withdrawal-requests')
  getWithdrawalRequests(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() filterQuery?: WithdrawalRequestFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    return this.sellerAccountServiceForSeller.getWithdrawalRequests(authedSeller, filterQuery, paginationQuery);
  }
  

  @ApiOperation({summary: 'Получить запрос на вывод средств'})
  @Get('/withdrawal-requests/:withdrawalRequestId')
  getWithdrawalRequest(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('withdrawalRequestId') withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountServiceForSeller.getWithdrawalRequest(authedSeller, withdrawalRequestId);
  }
}




@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/sellers/:sellerId/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class SellerAccountControllerForAdmin {
  constructor(private readonly sellerAccountServiceForAdmin: SellerAccountServiceForAdmin) {}

  @ApiOperation({summary: 'Получить аккаунт продовца'})
  @Get('/')
  getSellerAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('sellerId') sellerId: string,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountServiceForAdmin.getSellerAccount(authedAdmin, sellerId);
  }
}
