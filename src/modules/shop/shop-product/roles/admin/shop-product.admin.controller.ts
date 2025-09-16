import { Controller, Get, Param, UseGuards, Patch, Body, Query } from '@nestjs/common';
import { ShopProductAdminService } from './shop-product.admin.service';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './shop-product.admin.response.dtos';
import { ApiTags, ApiOperation, ApiBearerAuth} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { GetUser } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ShopProductQueryFilterDto } from './shop-product.admin.filter.dtos';

@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/shop-products')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class ShopProductAdminController {
  constructor(private readonly shopProductAdminService: ShopProductAdminService) {}

  @ApiOperation({summary: 'Получает превью продуктов магазина с пагинацией'})
  @Get('/')
  getShopProducts(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() shopProductQueryFilter: ShopProductQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    return this.shopProductAdminService.getShopProducts(authedAdmin, shopProductQueryFilter, paginationQuery);
  }


  @ApiOperation({summary: 'Получает полную информацию о продукте магазина'})
  @Get('/:shopProductId')
  getShopProduct(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductFullResponseDto> {
    return this.shopProductAdminService.getShopProduct(authedAdmin, shopId, shopProductId);
  }
}
