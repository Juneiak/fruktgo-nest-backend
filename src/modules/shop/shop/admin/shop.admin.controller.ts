import { Controller, Get, Param, UseGuards, Patch, Body, Query } from '@nestjs/common';
import { ShopAdminService } from './shop.admin.service';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './shop.admin.response.dto';
import { UpdateShopDto } from './shop.admin.request.dto';

import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('shops/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShopAdminController {
  constructor(private readonly shopAdminService: ShopAdminService) {}

  @ApiOperation({summary: 'Получает информацию обо всех магазинах с пагинацией'})
  @Get('/')
  getAllShops(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    return this.shopAdminService.getShops(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о магазине'})
  @Get('/:shopId')
  getCurrentShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string
  ): Promise<ShopFullResponseDto> {
    return this.shopAdminService.getShop(authedAdmin, shopId);
  }


  @ApiOperation({summary: 'Получает логи магазина'})
  @Get('/:shopId/logs')
  getShopLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopAdminService.getShopLogs(authedAdmin, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновляет информацию о магазине'})
  @Patch('/:shopId')
  updateShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopDto,
  ): Promise<ShopFullResponseDto> {
    return this.shopAdminService.updateShop(authedAdmin, shopId, dto);
  }
}
