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
import { PlatformAccountServiceForAdmin } from './platform-account.role-services';
import { PlatformAccountResponseDto, PlatformAccountTransactionResponseDto } from './platform-account.response.dtos';
import { CreateCorrectionDto } from './platform-account.request.dtos';


@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/platform-account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class PlatformAccountControllerForAdmin {
  constructor(private readonly platformAccountServiceForAdmin: PlatformAccountServiceForAdmin) {}

  @ApiOperation({summary: 'Получить аккаунт платформы'})
  @ApiOkResponse({type: PlatformAccountResponseDto})
  @Get('/')
  getPlatformAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
  ): Promise<PlatformAccountResponseDto> {
    return this.platformAccountServiceForAdmin.getPlatformAccount(authedAdmin);
  }

  @ApiOperation({summary: 'Получить транзакции платформенного счета'})
  @ApiOkResponse({type: PlatformAccountTransactionResponseDto, isArray: true})
  @Get('/transactions')
  getPlatformAccountTransactions(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PlatformAccountTransactionResponseDto>> {
    return this.platformAccountServiceForAdmin.getPlatformAccountTransactions(authedAdmin, paginationQuery);
  }

  @ApiOperation({summary: 'Получить транзакции платформенного счета'})
  @ApiOkResponse({type: PlatformAccountTransactionResponseDto})
  @Get('/transactions/:platformAccountTransactionId')
  getPlatformAccountTransaction(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('platformAccountTransactionId') platformAccountTransactionId: string,
  ): Promise<PlatformAccountTransactionResponseDto> {
    return this.platformAccountServiceForAdmin.getPlatformAccountTransaction(authedAdmin, platformAccountTransactionId);
  }

  @ApiOperation({summary: 'Создать корректировку баланса продавца'})
  @ApiOkResponse({type: PlatformAccountTransactionResponseDto})
  @Post('/transactions')
  createCorrection(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Body() correctionDto: CreateCorrectionDto
  ): Promise<PlatformAccountTransactionResponseDto> {
    return this.platformAccountServiceForAdmin.createCorrection(authedAdmin, correctionDto);
  }

}
