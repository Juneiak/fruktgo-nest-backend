import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { OrderAdminService } from './order.admin.service';
import {
  OrderPreviewResponseDto,
  OrderFullResponseDto
} from './order.admin.response.dto';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { OrderFilterDto } from './order.admin.filter.dto';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class OrderAdminController {
  constructor(private readonly orderAdminService: OrderAdminService) {}

  @ApiOperation({ summary: 'Получить заказы с возможностью фильтрации' })
  @Get('/')
  async getAllOrders(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query() orderFilterQuery?: OrderFilterDto
  ): Promise<PaginatedResponseDto<OrderPreviewResponseDto>> {
    return this.orderAdminService.getOrders(authedAdmin, paginationQuery, orderFilterQuery);
  }


  @ApiOperation({ summary: 'Получить заказ' })
  @Get('/:orderId')
  async getCurrentOrder(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string
  ): Promise<OrderFullResponseDto> {
    return this.orderAdminService.getOrder(authedAdmin, orderId);
  }


  @ApiOperation({ summary: 'Получить логи заказа' })
  @Get('/:orderId/logs')
  async getOrderLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.orderAdminService.getOrderLogs(authedAdmin, orderId, paginationQuery);
  }
}
