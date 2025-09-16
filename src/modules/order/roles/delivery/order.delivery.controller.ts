import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/common/dtos';
import {OrderDeliveryService} from './order.delivery.service';

@ApiTags('for delivery')
@ApiBearerAuth('JWT-auth')
@Controller('delivery/orders')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('delivery')
export class OrderDeliveryController {
  constructor(private readonly orderDeliveryService: OrderDeliveryService) {}

  @ApiOperation({ summary: 'Завершение доставки заказа курьером' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Post(':orderId/complete')
  completeOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedDelivery: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    return this.orderDeliveryService.completeOrder(orderId, authedDelivery);
  }
}
