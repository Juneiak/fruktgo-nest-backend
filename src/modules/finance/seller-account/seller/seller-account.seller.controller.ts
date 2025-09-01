import { Body, Controller, Get, Post, Query, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { SellerAccountSellerService } from './seller-account.seller.service';
import { SellerAccountResponseDto, WithdrawalRequestResponseDto } from './seller-account.seller.response.dtos';
import {
  UpdateBankDetailsDto,
  CreateWithdrawalRequestDto,
  WithdrawalRequestFilterQueryDto,
} from './seller-account.seller.request.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerAccountSellerController {
  constructor(private readonly sellerAccountSellerService: SellerAccountSellerService) {}

  @ApiOperation({summary: 'Получить аккаунт продовца'})
  @Get('/')
  getSellerAccount(
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountSellerService.getSellerAccount(authedSeller);
  }


  @ApiOperation({summary: 'Обновить банковские реквизиты'})
  @Patch('/')
  updateBankDetails(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() bankDetailsDto: UpdateBankDetailsDto,
  ): Promise<SellerAccountResponseDto> {
    return this.sellerAccountSellerService.updateBankDetails(authedSeller, bankDetailsDto);
  }


  @ApiOperation({summary: 'создать запрос на вывод средств'})
  @Post('/withdrawal-request')
  createWithdrawalRequest(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() createWithdrawalRequestDto: CreateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountSellerService.createWithdrawalRequest(authedSeller, createWithdrawalRequestDto);
  }


  @ApiOperation({summary: 'Получить все запросы на вывод средств'})
  @Get('/withdrawal-requests')
  getWithdrawalRequests(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() filterQuery?: WithdrawalRequestFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    return this.sellerAccountSellerService.getWithdrawalRequests(authedSeller, filterQuery, paginationQuery);
  }
  

  @ApiOperation({summary: 'Получить запрос на вывод средств'})
  @Get('/withdrawal-requests/:withdrawalRequestId')
  getWithdrawalRequest(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('withdrawalRequestId') withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountSellerService.getWithdrawalRequest(authedSeller, withdrawalRequestId);
  }
}
