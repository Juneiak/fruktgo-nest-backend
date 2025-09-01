import { Body, Controller, Get, Post, Query, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { PlatformAccountResponseDto, PlatformAccountTransactionResponseDto } from './platform-account.admin.response.dto';
import { CreateCorrectionDto } from './platform-account.admin.request.dto';
import { PlatformAccountAdminService } from './platform-account.admin.service';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/platform-account')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class PlatformAccountAdminController {
  constructor(private readonly platformAccountAdminService: PlatformAccountAdminService) {}

  @ApiOperation({summary: 'Получить аккаунт платформы'})
  @Get('/')
  getPlatformAccount(
    @GetUser() authedAdmin: AuthenticatedUser,
  ): Promise<PlatformAccountResponseDto> {
    return this.platformAccountAdminService.getPlatformAccount(authedAdmin);
  }

  @ApiOperation({summary: 'Получить транзакции платформенного счета'})
  @Get('/transactions')
  getPlatformAccountTransactions(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PlatformAccountTransactionResponseDto>> {
    return this.platformAccountAdminService.getPlatformAccountTransactions(authedAdmin, paginationQuery);
  }

  @ApiOperation({summary: 'Получить транзакции платформенного счета'})
  @Get('/transactions/:platformAccountTransactionId')
  getPlatformAccountTransaction(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('platformAccountTransactionId') platformAccountTransactionId: string,
  ): Promise<PlatformAccountTransactionResponseDto> {
    return this.platformAccountAdminService.getPlatformAccountTransaction(authedAdmin, platformAccountTransactionId);
  }

  @ApiOperation({summary: 'Создать корректировку баланса продавца'})
  @Post('/transactions')
  createCorrection(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Body() correctionDto: CreateCorrectionDto
  ): Promise<PlatformAccountTransactionResponseDto> {
    return this.platformAccountAdminService.createCorrection(authedAdmin, correctionDto);
  }

}
