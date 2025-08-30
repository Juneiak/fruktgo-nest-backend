import { Controller, Get, UseGuards, Param, Query, Post, Body, Patch, UploadedFile, UseInterceptors, Delete, SerializeOptions } from '@nestjs/common';
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
} from './product.seller.response.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { CreateProductDto, UpdateProductDto } from './product.seller.request.dto';
import { MessageResponseDto } from 'src/common/dtos';
import { ProductSellerService } from './product.seller.service';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('seller/products')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ProductSellerController {
  constructor(private readonly productSellerService: ProductSellerService) {}

  @ApiOperation({summary: 'создание продукта продавцом'})
  @Post('/')
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  createProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFile() cardImage?: Express.Multer.File
  ): Promise<ProductPreviewResponseDto> {
    return this.productSellerService.createProduct(authedSeller, dto, cardImage );
  }


  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией'})
  @Get('/')
  getAllSellerProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise< PaginatedResponseDto<ProductPreviewResponseDto> > {
    return this.productSellerService.getProducts(authedSeller, paginationQuery);
  }


  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией данного магазина'})
  @Get('/controls')
  getProductsOfShops(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('shopId') shopId: string
  ): Promise< PaginatedResponseDto<ProductOfShopResponseDto> > {
    return this.productSellerService.getProductsOfShops(authedSeller, paginationQuery, shopId);
  }


  @ApiOperation({summary: 'обновление продукта продавцом'})
  @Patch('/:productId')
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  updateProduct(
    @Param('productId') productId: string, 
    @GetUser() authedSeller: AuthenticatedUser, 
    @Body() dto: UpdateProductDto, 
    @UploadedFile() cardImage?: Express.Multer.File
  ): Promise<ProductFullResponseDto> {
    return this.productSellerService.updateProduct(authedSeller, productId, dto, cardImage);
  }


  @ApiOperation({summary: 'удаление продукта продавцом'})
  @Delete('/:productId')
  deleteProduct(@Param('productId') productId: string, @GetUser() authedSeller: AuthenticatedUser): Promise<MessageResponseDto> {
    return this.productSellerService.deleteProduct(authedSeller, productId);
  }


  @ApiOperation({summary: 'получение полного продукта продавца'})
  @Get('/:productId')
  getSellerProduct(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string
  ): Promise<ProductFullResponseDto> {
    return this.productSellerService.getProduct(authedSeller, productId);
  }


  @ApiOperation({summary: 'получение списка логов продукта продавца с пагинацией'})
  @Get('/:productId/logs')
  getSellerProductLogs(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string, 
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.productSellerService.getSellerProductLogs(authedSeller, productId, paginationQuery);
  }
}
