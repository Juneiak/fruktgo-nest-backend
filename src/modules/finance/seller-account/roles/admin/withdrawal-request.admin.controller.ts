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
import { SellerAccountAdminService } from './seller-account.admin.service'
import { WithdrawalRequestResponseDto } from './seller-account.admin.response.dtos';
import { WithdrawalRequestFilterQueryDto, UpdateWithdrawalRequestDto } from './seller-account.admin.request.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/withdrawal-requests')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class WithdrawalRequestAdminController {
  constructor(private readonly sellerAccountAdminService: SellerAccountAdminService) {}

  @ApiOperation({summary: 'Получить все заявки на вывод средств'})
  @ApiOkResponse({type: WithdrawalRequestResponseDto})
  @Get('/')
  getWithdrawalRequests(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() filterQuery?: WithdrawalRequestFilterQueryDto,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WithdrawalRequestResponseDto>> {
    return this.sellerAccountAdminService.getWithdrawalRequests(authedAdmin, filterQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получить заявку на вывод средств'})
  @ApiOkResponse({type: WithdrawalRequestResponseDto})
  @Get('/:withdrawalRequestId')
  getWithdrawalRequest(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('withdrawalRequestId') withdrawalRequestId: string,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountAdminService.getWithdrawalRequest(authedAdmin, withdrawalRequestId);
  }


  @ApiOperation({summary: 'Обновить заявку на вывод средств'})
  @ApiOkResponse({type: WithdrawalRequestResponseDto})
  @Put('/:withdrawalRequestId')
  updateWithdrawalRequest(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('withdrawalRequestId') withdrawalRequestId: string,
    @Body() updateWithdrawalRequestDto: UpdateWithdrawalRequestDto,
  ): Promise<WithdrawalRequestResponseDto> {
    return this.sellerAccountAdminService.updateWithdrawalRequest(authedAdmin, withdrawalRequestId, updateWithdrawalRequestDto);
  }
}
