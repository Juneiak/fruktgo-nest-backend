import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiProductIdParam } from 'src/common/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/common/dtos';
import {OrderForShopService} from './order-for-shop.service';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('orders/for-shop')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class OrderForShopController {
  constructor(private readonly orderForShopService: OrderForShopService) {} 
}
