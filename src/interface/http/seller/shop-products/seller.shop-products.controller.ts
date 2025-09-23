import { Controller, Get, Body, Param, Delete, Query, UseGuards, Post } from '@nestjs/common';
import { SellerShopProductsRoleService } from './seller.shop-products.role.service';
import { PaginationQueryDto } from "src/interface/http/common/common.query.dtos";
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import { UpdateShopProductDto} from './seller.shop-products.request.dtos';
import { ShopProductResponseDto } from './seller.shop-product.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';
import { ShopProductsQueryDto } from './seller.shop-products.query.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerShopProductsController {
  constructor(
    private readonly sellerShopProductsRoleService: SellerShopProductsRoleService,
  ) {}

  @ApiOperation({summary: 'Получение всех продуктов из магазина с пагинацией'})
  @Get()
  getShopProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shopProductQuery: ShopProductsQueryDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.sellerShopProductsRoleService.getShopProducts(authedSeller, shopProductQuery, paginationQuery);
  }


  @ApiOperation({summary: 'изменение кол-во и/или статуса продукта в магазине'})
  @Post(':shopProductId')
  updateShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateShopProductDto
  ): Promise<ShopProductResponseDto> {
    return this.sellerShopProductsRoleService.updateShopProduct(authedSeller, dto);
  }


  @ApiOperation({summary: 'Получение продукта из магазина'})
  @Get(':shopProductId')
  getShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductResponseDto> {
    return this.sellerShopProductsRoleService.getShopProduct(authedSeller, shopProductId);
  }


  @ApiOperation({summary: 'Получение логов продукта из магазина'})
  @Get(':shopProductId/logs')
  getShopProductLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.sellerShopProductsRoleService.getShopProductLogs(authedSeller, shopProductId, paginationQuery);
  }


  @ApiOperation({summary: 'Удаление продукта из магазина'})
  @Delete(':shopProductId')
  removeShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<MessageResponseDto> {
    return this.sellerShopProductsRoleService.removeShopProduct(authedSeller, shopProductId);
  }


  @ApiOperation({summary: 'Удаление фото продукта из магазина'})
  @Delete(':shopProductId/images/:imageId')
  removeShopProductImage(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('imageId') imageId: string
  ): Promise<ShopProductResponseDto> {
    return this.sellerShopProductsRoleService.removeShopProductImage(authedSeller, shopProductId, imageId);
  }
}
