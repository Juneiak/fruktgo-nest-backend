import { Controller, Get, Param, UseGuards, Patch, Body, Query } from '@nestjs/common';
import { AdminShopsRoleService } from './admin.shops.role.service';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './admin.shops.response.dtos';
import { UpdateShopDto } from './admin.shops.request.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminShopsController {
  constructor(private readonly adminShopsRoleService: AdminShopsRoleService) {}

  @ApiOperation({summary: 'Получает информацию обо всех магазинах с пагинацией'})
  @Get()
  getAllShops(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    return this.adminShopsRoleService.getShops(authedAdmin, paginationQuery);
  }


  @ApiOperation({summary: 'Получает информацию о магазине'})
  @Get(':shopId')
  getCurrentShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string
  ): Promise<ShopFullResponseDto> {
    return this.adminShopsRoleService.getShop(authedAdmin, shopId);
  }


  @ApiOperation({summary: 'Получает логи магазина'})
  @Get(':shopId/logs')
  getShopLogs(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.adminShopsRoleService.getShopLogs(authedAdmin, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Обновляет информацию о магазине'})
  @Patch(':shopId')
  updateShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopDto,
  ): Promise<ShopFullResponseDto> {
    return this.adminShopsRoleService.updateShop(authedAdmin, shopId, dto);
  }
}
