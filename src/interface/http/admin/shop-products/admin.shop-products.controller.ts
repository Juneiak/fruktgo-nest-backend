import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AdminShopProductsRoleService } from './admin.shop-products.role.service';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './admin.shop-products.response.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ShopProductQueryDto } from './admin.shop-products.query.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminShopProductsController {
  constructor(private readonly adminShopProductsRoleService: AdminShopProductsRoleService) {}

  @ApiOperation({summary: 'Получает превью продуктов магазина с пагинацией'})
  @Get()
  getShopProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() shopProductQuery: ShopProductQueryDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    return this.adminShopProductsRoleService.getShopProducts(authedAdmin, shopProductQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Получает полную информацию о продукте магазина'})
  @Get(':shopProductId')
  getShopProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductFullResponseDto> {
    return this.adminShopProductsRoleService.getShopProduct(authedAdmin, shopId, shopProductId);
  }
}
