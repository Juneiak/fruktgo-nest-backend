import { Controller, Delete, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { CustomerOrdersRoleService } from './customer.orders.role.service';
import {
  CreateOrderDto,
  CancelOrderDto,
} from './customer.orders.request.dtos';
import {
  OrderFullResponseDto,
  OrderPreviewResponseDto,
  OrderCreatedResponseDto,
  RateTheOrderResponseDto
} from './customer.orders.response.dtos';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerOrdersController {
  constructor(private readonly customerOrdersRoleService: CustomerOrdersRoleService) {}

  
  @ApiOperation({summary: 'Создать заказ'})
  @Post()
  createOrder(
    @Body() dto: CreateOrderDto,
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<OrderCreatedResponseDto> {
    return this.customerOrdersRoleService.createOrder(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Отменить заказ'})
  @Delete(':orderId')
  cancelOrder(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ): Promise<OrderFullResponseDto> {
    return this.customerOrdersRoleService.cancelOrder(authedCustomer, orderId, dto);
  }


  @ApiOperation({summary: 'Получить полный заказ'})
  @Get(':orderId')
  getFullOrder(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('orderId') orderId: string
  ): Promise<OrderFullResponseDto> {
    return this.customerOrdersRoleService.getFullOrder(authedCustomer, orderId);
  }


  @ApiOperation({summary: 'Получить список всех заказов'})
  @Get()
  getOrders(@GetUser() authedCustomer: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
    return this.customerOrdersRoleService.getOrders(authedCustomer);
  }


  @ApiOperation({summary: 'Получить список активных заказов'})
  @Get('active')
  getActiveOrders(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<OrderFullResponseDto[]> {
    return this.customerOrdersRoleService.getActiveOrders(authedCustomer);
  }


  @ApiOperation({summary: 'Поставить оценку'})
  @Post(':orderId/rating')
  setRating(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: RateTheOrderResponseDto
  ): Promise<RateTheOrderResponseDto> {
    return this.customerOrdersRoleService.setRating(authedCustomer, orderId, dto);
  }

}
