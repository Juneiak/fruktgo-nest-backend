import { Controller, Delete, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { OrderCustomerService } from './order.customer.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  RateTheOrderDto
} from './order.customer.request.dto';
import {
  OrderFullResponseDto,
  OrderPreviewResponseDto,
  OrderCreatedResponseDto,
  RateTheOrderResponseDto
} from './order.customer.response.dto';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller('customer/orders')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class OrderCustomerController {
  constructor(private readonly orderCustomerService: OrderCustomerService) {}

  
  @ApiOperation({summary: 'Создать заказ'})
  @Post('/')
  createOrder(@Body() dto: CreateOrderDto, @GetUser() authedCustomer: AuthenticatedUser): Promise<OrderCreatedResponseDto> {
    return this.orderCustomerService.createOrder(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Отменить заказ'})
  @Delete('/:orderId')
  cancelOrder(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ): Promise<OrderFullResponseDto> {
    return this.orderCustomerService.cancelOrder(authedCustomer, orderId, dto);
  }


  @ApiOperation({summary: 'Получить полный заказ'})
  @Get('/:orderId')
  getFullOrder(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('orderId') orderId: string
  ): Promise<OrderFullResponseDto> {
    return this.orderCustomerService.getFullOrder(authedCustomer, orderId);
  }


  @ApiOperation({summary: 'Получить список всех заказов'})
  @Get('/')
  getOrders(@GetUser() authedCustomer: AuthenticatedUser): Promise<OrderPreviewResponseDto[]> {
    return this.orderCustomerService.getOrders(authedCustomer);
  }


  @ApiOperation({summary: 'Получить список активных заказов'})
  @Get('/active')
  getActiveOrders(@GetUser() authedCustomer: AuthenticatedUser): Promise<OrderFullResponseDto[]> {
    return this.orderCustomerService.getActiveOrders(authedCustomer);
  }


  @ApiOperation({summary: 'Поставить оценку'})
  @Post('/:orderId/rating')
  setRating(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: RateTheOrderResponseDto
  ): Promise<RateTheOrderResponseDto> {
    return this.orderCustomerService.setRating(authedCustomer, orderId, dto);
  }

}
