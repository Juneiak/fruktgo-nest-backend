import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/interface/http/shared';
import {DeliveryOrdersRoleService} from './delivery.orders.role.service'; 

@ApiTags('for delivery')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('delivery')
export class DeliveryOrdersController {
  constructor(private readonly deliveryOrdersRoleService: DeliveryOrdersRoleService) {}

  @ApiOperation({ summary: 'Завершение доставки заказа курьером' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Post(':orderId/complete')
  completeOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedDelivery: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    return this.deliveryOrdersRoleService.completeOrder(orderId, authedDelivery);
  }
}
