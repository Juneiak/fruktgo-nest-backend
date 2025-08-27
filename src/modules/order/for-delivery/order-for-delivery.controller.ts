import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiProductIdParam } from 'src/common/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/common/dtos';
import {OrderForDeliveryService} from './order-for-delivery.service';

@ApiTags('for delivery')
@ApiBearerAuth('JWT-auth')
@Controller('orders/for-delivery')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('delivery')
export class OrderForDeliveryController {
  constructor(private readonly orderForDeliveryService: OrderForDeliveryService) {}

  @ApiOperation({ summary: 'Завершение доставки заказа курьером' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Post(':orderId/complete')
  completeOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedDelivery: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    return this.orderForDeliveryService.completeOrder(orderId, authedDelivery);
  }
}
