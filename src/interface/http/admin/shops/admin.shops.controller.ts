import { Controller, Get, Param, UseGuards, Patch, Body, Query } from '@nestjs/common';
import { AdminShopsRoleService } from './admin.shops.role.service';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './admin.shops.response.dtos';
import { UpdateShopDto, BlockShopDto } from './admin.shops.request.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, LogResponseDto } from 'src/interface/http/shared';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ShopQueryFilterDto } from './admin.shops.query.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminShopsController {
  constructor(
    private readonly adminShopsRoleService: AdminShopsRoleService
  ) {}

  @ApiOperation({summary: 'Получает информацию обо всех магазинах с пагинацией'})
  @Get()
  getAllShops(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() shopQueryFilter: ShopQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    return this.adminShopsRoleService.getShops(authedAdmin, shopQueryFilter, paginationQuery);
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
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
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


  @ApiOperation({summary: 'Блокирует/разблокирует магазин'})
  @Patch(':shopId/block')
  blockShop(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: BlockShopDto
  ): Promise<ShopFullResponseDto> {
    return this.adminShopsRoleService.blockShop(authedAdmin, shopId, dto);
  }
}
