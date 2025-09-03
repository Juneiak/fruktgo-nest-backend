import { Controller, Get, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ShopProductSellerService } from './shop-product.seller.service';
import { PaginationQueryDto, PaginatedResponseDto } from "src/common/dtos";
import { UpdateShopProductDto} from './shop-product.seller.request.dto';
import { ShopProductResponseDto } from './shop-product.seller.response.dto';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { MessageResponseDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/shop-products')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ShopProductSellerController {
  constructor(
    private readonly shopProductSellerService: ShopProductSellerService,
  ) {}

  @ApiOperation({summary: 'Получение всех продуктов из магазина с пагинацией'})
  @Get('/:shopId/shop-products')
  getShopProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.shopProductSellerService.getShopProducts(authedSeller, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Получение продукта из магазина'})
  @Get('/:shopId/shop-products/:shopProductId')
  getShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string
  ): Promise<ShopProductResponseDto> {
    return this.shopProductSellerService.getShopProduct(authedSeller, shopId, shopProductId);
  }


  @ApiOperation({summary: 'Получение логов продукта из магазина'})
  @Get('/:shopId/shop-products/:shopProductId/logs')
  getShopProductLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopProductSellerService.getShopProductLogs(authedSeller, shopId, shopProductId, paginationQuery);
  }

  
  @ApiOperation({summary: 'изменение кол-во и/или статуса продукта в магазине'})
  @Patch('/:shopId/shop-products')
  updateShopProduct(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateShopProductDto
  ): Promise<ShopProductResponseDto> {
    return this.shopProductSellerService.updateShopProduct(authedSeller, shopId, dto);
  }


  @ApiOperation({summary: 'Удаление продукта из магазина'})
  @Delete('/:shopId/shop-products/:shopProductId')
  removeProductFromShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string
  ): Promise<MessageResponseDto> {
    return this.shopProductSellerService.removeProductFromShop(authedSeller, shopId, shopProductId);
  }


  @ApiOperation({summary: 'Удаление фото продукта из магазина'})
  @Delete('/:shopId/shop-products/:shopProductId/images/:imageId')
  removeShopProductImage(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string,
    @Param('imageId') imageId: string
  ): Promise<MessageResponseDto> {
    return this.shopProductSellerService.removeShopProductImage(authedSeller, shopId, shopProductId, imageId);
  }
}
