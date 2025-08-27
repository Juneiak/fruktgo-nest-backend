import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {OrderForCustomerService} from './order-for-customer.service';
import { CreateOrderDto,
  CancelOrderDto,
  OrderCreatedResponseDto,
  OrderForCustomerFullResponseDto,
  OrderForCustomerPreviewResponseDto,
  RateTheOrderDto,
  RateTheOrderResponseDto
} from './order-for-customer.dtos';
import { ApiOrderIdParam } from 'src/common/swagger';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller('orders/for-customer')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class OrderForCustomerController {
  constructor(private readonly orderForCustomerService: OrderForCustomerService) {}

  
  @ApiOperation({summary: 'Создать заказ'})
  @ApiBody({type: CreateOrderDto})
  @ApiOkResponse({type: OrderCreatedResponseDto})
  // ====================================================
  @Post('/')
  createOrder(@Body() dto: CreateOrderDto, @GetUser() authedCustomer: AuthenticatedUser): Promise<OrderCreatedResponseDto> {
    return this.orderForCustomerService.createOrder(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Отменить заказ'})
  @ApiBody({type: CancelOrderDto})
  @ApiOrderIdParam()
  @ApiOkResponse({type: OrderForCustomerFullResponseDto})
  // ====================================================
  @Delete('/:orderId')
  cancelOrder(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto
  ): Promise<OrderForCustomerFullResponseDto> {
    return this.orderForCustomerService.cancelOrder(authedCustomer, orderId, dto);
  }


  @ApiOperation({summary: 'Получить полный заказ'})
  @ApiOrderIdParam()
  @ApiOkResponse({type: OrderForCustomerFullResponseDto})
  // ====================================================
  @Get('/:orderId')
  getFullOrder(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('orderId') orderId: string
  ): Promise<OrderForCustomerFullResponseDto> {
    return this.orderForCustomerService.getFullOrder(authedCustomer, orderId);
  }


  @ApiOperation({summary: 'Получить список всех заказов'})
  @ApiOkResponse({type: OrderForCustomerPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/')
  getOrders(@GetUser() authedCustomer: AuthenticatedUser): Promise<OrderForCustomerPreviewResponseDto[]> {
    return this.orderForCustomerService.getOrders(authedCustomer);
  }

  
  @ApiOperation({summary: 'Получить список активных заказов'})
  @ApiOkResponse({type: OrderForCustomerFullResponseDto, isArray: true})
  // ====================================================
  @Get('/active')
  getActiveOrders(@GetUser() authedCustomer: AuthenticatedUser): Promise<OrderForCustomerFullResponseDto[]> {
    return this.orderForCustomerService.getActiveOrders(authedCustomer);
  }


  @ApiOperation({summary: 'Поставить оценку'})
  @ApiBody({type: RateTheOrderDto})
  @ApiOrderIdParam()
  @ApiOkResponse({type: RateTheOrderResponseDto})
  // ====================================================
  @Post('/:orderId/rating')
  setRating(
    @GetUser() authedCustomer: AuthenticatedUser,
    @Param('orderId') orderId: string,
    @Body() dto: RateTheOrderDto
  ): Promise<RateTheOrderResponseDto> {
    return this.orderForCustomerService.setRating(authedCustomer, orderId, dto);
  }

}
