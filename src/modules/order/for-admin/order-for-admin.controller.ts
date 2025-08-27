import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import {OrderForAdminService} from './order-for-admin.service';
import {OrderForAdminPreviewResponseDto, OrderForAdminFullResponseDto} from './order-for-admin.dtos';
import { ApiOrderIdParam } from 'src/common/swagger';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { OrderFilterDto } from './order-for-admin.filter.dto';

@ApiTags('for delivery')
@ApiBearerAuth('JWT-auth')
@Controller('orders/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class OrderForAdminController {
  constructor(private readonly orderForAdminService: OrderForAdminService) {}

  @ApiOperation({ summary: 'Получить заказы с возможностью фильтрации' })
  @ApiOkResponse({ type: () => PaginatedResponseDto })
  @Get('/')
  async getAllOrders(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() orderFilterQuery?: OrderFilterDto
  ): Promise<PaginatedResponseDto<OrderForAdminPreviewResponseDto>> {
    return this.orderForAdminService.getOrders(authedAdmin, paginationQuery, orderFilterQuery);
  }

  @ApiOperation({ summary: 'Получить заказ' })
  @ApiOkResponse({ type: OrderForAdminFullResponseDto })
  @ApiOrderIdParam()
  @Get('/:orderId')
  async getCurrentOrder(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string
  ): Promise<OrderForAdminFullResponseDto> {
    return this.orderForAdminService.getOrder(authedAdmin, orderId);
  }

  @ApiOperation({ summary: 'Получить логи заказа' })
  @ApiOkResponse({ type: () => PaginatedLogDto })
  @ApiOrderIdParam()
  @Get('/:orderId/logs')
  async getOrderLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.orderForAdminService.getOrderLogs(authedAdmin, orderId, paginationQuery);
  }
}
