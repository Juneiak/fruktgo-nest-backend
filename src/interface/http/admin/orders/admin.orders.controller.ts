import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/shared';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { AdminOrdersRoleService } from './admin.orders.role.service';
import {
  OrderPreviewResponseDto,
  OrderFullResponseDto
} from './admin.orders.response.dtos';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dtos';
import { OrderQueryDto } from './admin.orders.query.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminOrdersController {
  constructor(private readonly adminOrdersRoleService: AdminOrdersRoleService) {}

  @ApiOperation({ summary: 'Получить заказы с возможностью фильтрации' })
  @Get()
  async getAllOrders(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() orderQuery?: OrderQueryDto
  ): Promise<PaginatedResponseDto<OrderPreviewResponseDto>> {
    return this.adminOrdersRoleService.getOrders(authedAdmin, paginationQuery, orderQuery);
  }


  @ApiOperation({ summary: 'Получить заказ' })
  @Get(':orderId')
  async getCurrentOrder(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string
  ): Promise<OrderFullResponseDto> {
    return this.adminOrdersRoleService.getOrder(authedAdmin, orderId);
  }


  @ApiOperation({ summary: 'Получить логи заказа' })
  @Get(':orderId/logs')
  async getOrderLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.adminOrdersRoleService.getOrderLogs(authedAdmin, orderId, paginationQuery);
  }
}
