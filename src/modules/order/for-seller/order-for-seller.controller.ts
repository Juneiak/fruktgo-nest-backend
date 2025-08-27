import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import {OrderForSellerService} from './order-for-seller.service';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('orders/for-seller')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class OrderForSellerController {
  constructor(private readonly orderForSellerService: OrderForSellerService) {}

  
}
