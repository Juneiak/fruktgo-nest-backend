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
import { 
  SettlementPeriodFilterQueryDto,
  SettlementPeriodTransactionFilterQueryDto,
  CreateCorrectionDto, 
  ApproveSettlementPeriodDto,
  UpdateShopAccountDto
} from './shop-account.admin.request.dtos';
import { 
  SettlementPeriodResponseDto, 
  SettlementPeriodTransactionResponseDto, 
  ShopAccountResponseDto
} from './shop-account.admin.response.dtos';
import { ShopAccountAdminService } from './shop-account.admin.service';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shops/:shopId/account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShopAccountAdminController {
  constructor(private readonly shopAccountAdminService: ShopAccountAdminService) {}

  @ApiOperation({summary: 'Получить аккаунт магазина'})
  @Get('/')
  getShopAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountAdminService.getShopAccount(authedAdmin, shopId);
  }

  @ApiOperation({summary: 'Обновить аккаунт магазина'})
  @Patch('/')
  updateShopAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() updateShopAccountDto: UpdateShopAccountDto,
  ): Promise<ShopAccountResponseDto> {
    return this.shopAccountAdminService.updateShopAccount(authedAdmin, shopId, updateShopAccountDto);
  }


  @ApiOperation({summary: 'Получить периоды аккаунта магазина'})
  @Get('/settlement-periods')
  getSettlementPeriods(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() filterQuery?: SettlementPeriodFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodResponseDto>> {
    return this.shopAccountAdminService.getShopSettlementPeriods(authedAdmin, shopId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить список транзакций для администратора'})
  @Get('/settlement-periods/:settlementPeriodId/transactions')
  getTransactions(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Query() paginationQuery?: PaginationQueryDto,
    @Query() filterQuery?: SettlementPeriodTransactionFilterQueryDto,
  ): Promise<PaginatedResponseDto<SettlementPeriodTransactionResponseDto>> {
    return this.shopAccountAdminService.getSettlementPeriodTransactions(authedAdmin, settlementPeriodId, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Создать корректировку баланса продавца'})
  @Post('/settlement-periods/:settlementPeriodId/transactions')
  createCorrection(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Body() correctionDto: CreateCorrectionDto
  ): Promise<SettlementPeriodTransactionResponseDto> {
    return this.shopAccountAdminService.createCorrection(authedAdmin, settlementPeriodId, correctionDto);
  }

  @ApiOperation({summary: 'Закрыть период'})
  @Post('/settlement-periods/:settlementPeriodId/close')
  closeSettlementPeriod(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
  ): Promise<SettlementPeriodResponseDto> {
    return this.shopAccountAdminService.closeSettlementPeriod(authedAdmin, settlementPeriodId);
  }


  @ApiOperation({summary: 'Потвердить закрытие периода'})
  @Post('/settlement-periods/:settlementPeriodId/approve')
  approveSettlementPeriod(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('settlementPeriodId') settlementPeriodId: string,
    @Body() approveDto: ApproveSettlementPeriodDto
  ): Promise<SettlementPeriodResponseDto> {
    return this.shopAccountAdminService.approveSettlementPeriod(authedAdmin, settlementPeriodId, approveDto);
  }
}
