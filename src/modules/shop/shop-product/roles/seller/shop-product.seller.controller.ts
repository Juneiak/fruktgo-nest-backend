import { Controller, Get, Body, Param, Patch, Delete, Query, UseGuards, Post } from '@nestjs/common';
import { ShopProductSellerService } from './shop-product.seller.service';
import { PaginationQueryDto, PaginatedResponseDto, MessageResponseDto } from "src/common/dtos";
import { UpdateShopProductDto} from './shop-product.seller.request.dtos';
import { ShopProductResponseDto } from './shop-product.seller.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { ShopProductQueryFilterDto } from '../admin/shop-product.admin.filter.dtos';

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
  @Get('/')
  getShopProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() shopProductQueryFilter: ShopProductQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.shopProductSellerService.getShopProducts(authedSeller, shopProductQueryFilter, paginationQuery);
  }


  @ApiOperation({summary: 'изменение кол-во и/или статуса продукта в магазине'})
  @Post('/:shopProductId')
  updateShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateShopProductDto
  ): Promise<ShopProductResponseDto> {
    return this.shopProductSellerService.updateShopProduct(authedSeller, dto);
  }


  @ApiOperation({summary: 'Получение продукта из магазина'})
  @Get('/:shopProductId')
  getShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductSellerService.getShopProduct(authedSeller, shopProductId);
  }


  @ApiOperation({summary: 'Получение логов продукта из магазина'})
  @Get('/:shopProductId/logs')
  getShopProductLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopProductSellerService.getShopProductLogs(authedSeller, shopProductId, paginationQuery);
  }


  @ApiOperation({summary: 'Удаление продукта из магазина'})
  @Delete('/:shopProductId')
  removeShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<MessageResponseDto> {
    return this.shopProductSellerService.removeShopProduct(authedSeller, shopProductId);
  }


  @ApiOperation({summary: 'Удаление фото продукта из магазина'})
  @Delete('/:shopProductId/images/:imageId')
  removeShopProductImage(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('imageId') imageId: string
  ): Promise<ShopProductResponseDto> {
    return this.shopProductSellerService.removeShopProductImage(authedSeller, shopProductId, imageId);
  }
}
