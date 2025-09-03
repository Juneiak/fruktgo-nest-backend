import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import {OrderSellerService} from './order.seller.service';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/orders')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class OrderSellerController {
  constructor(private readonly orderSellerService: OrderSellerService) {}

  
}
