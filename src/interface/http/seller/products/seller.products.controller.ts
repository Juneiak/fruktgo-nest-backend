import { Controller, Get, UseGuards, Param, Query, Post, Body, Patch, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  ProductPreviewResponseDto,
  ProductFullResponseDto,
  ProductOfShopResponseDto,
} from './seller.products.response.dtos';
import { PaginatedResponseDto, MessageResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { CreateProductDto, UpdateProductDto } from './seller.products.request.dtos';
import { SellerProductsRoleService } from './seller.products.role.service';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class SellerProductsController {
  constructor(private readonly sellerProductsRoleService: SellerProductsRoleService) {}

  @ApiOperation({summary: 'создание продукта продавцом'})
  @Post()
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  createProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFile() cardImage?: Express.Multer.File
  ): Promise<ProductPreviewResponseDto> {
    return this.sellerProductsRoleService.createProduct(authedSeller, dto, cardImage );
  }


  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией'})
  @Get()
  getSellerProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise< PaginatedResponseDto<ProductPreviewResponseDto> > {
    return this.sellerProductsRoleService.getProducts(authedSeller, paginationQuery);
  }


  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией данного магазина'})
  @Get('controls')
  getProductsOfShops(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('shopId') shopId: string
  ): Promise< PaginatedResponseDto<ProductOfShopResponseDto> > {
    return this.sellerProductsRoleService.getProductsOfShop(authedSeller, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'обновление продукта продавцом'})
  @Patch(':productId')
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  updateProduct(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Body() dto: UpdateProductDto,
    @Param('productId') productId: string,
    @UploadedFile() cardImage?: Express.Multer.File,
  ): Promise<ProductFullResponseDto> {
    return this.sellerProductsRoleService.updateProduct(authedSeller, productId, dto, cardImage);
  }


  @ApiOperation({summary: 'удаление продукта продавцом'})
  @Delete(':productId')
  deleteProduct(@Param('productId') productId: string, @GetUser() authedSeller: AuthenticatedUser): Promise<MessageResponseDto> {
    return this.sellerProductsRoleService.deleteProduct(authedSeller, productId);
  }


  @ApiOperation({summary: 'получение полного продукта продавца'})
  @Get(':productId')
  getSellerProduct(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string
  ): Promise<ProductFullResponseDto> {
    return this.sellerProductsRoleService.getProduct(authedSeller, productId);
  }


  @ApiOperation({summary: 'получение списка логов продукта продавца с пагинацией'})
  @Get(':productId/logs')
  getSellerProductLogs(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string, 
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.sellerProductsRoleService.getSellerProductLogs(authedSeller, productId, paginationQuery);
  }
}
