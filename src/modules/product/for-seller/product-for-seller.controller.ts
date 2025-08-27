import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { ProductForSellerService } from './product-for-seller.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiProductIdParam } from 'src/common/swagger';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from "src/common/dtos";
import {
  CreateProductFormDataDto,
  UpdateProductDto,
  CreateProductDto,
  UpdateProductFormDataDto,
  ProductForSellerPreviewResponseDto,
  ProductForSellerFullResponseDto,
  ProductForSellerOfShopResponseDto
} from './product-for-seller.dtos';
import { MessageResponseDto } from 'src/common/dtos';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ApiFormData } from 'src/common/swagger/api-form-data.decorator';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';


@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('products/for-seller')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ProductForSellerController {
  constructor(private readonly productForSellerService: ProductForSellerService) {}

  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией данного магазина'})
  @ApiOkResponse({type: ProductForSellerOfShopResponseDto, isArray: true})
  // ====================================================
  @Get('/controls')
  getProductsOfShops(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto,
    @Query('shopId') shopId: string
  ): Promise< PaginatedResponseDto<ProductForSellerOfShopResponseDto> > {
    return this.productForSellerService.getProductsOfShops(authedSeller, paginationQuery, shopId);
  }
  
  
  @ApiOperation({summary: 'создание продукта продавцом'})
  @ApiFormData('cardImage', true, CreateProductFormDataDto)
  @ApiOkResponse({type: ProductForSellerPreviewResponseDto})
  // ====================================================
  @Post('/')
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  createProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateProductDto,
    @UploadedFile() cardImage?: Express.Multer.File
  ): Promise<ProductForSellerPreviewResponseDto> {
    return this.productForSellerService.createProduct(authedSeller, dto, cardImage );
  }


  @ApiOperation({summary: 'обновление продукта продавцом'})
  @ApiFormData('cardImage', true, UpdateProductFormDataDto)
  @ApiProductIdParam()
  @ApiOkResponse({type: ProductForSellerPreviewResponseDto})
  // ====================================================
  @Patch('/:productId')
  @UseInterceptors(ImageUploadInterceptor('cardImage'))
  updateProduct(
    @Param('productId') productId: string, 
    @GetUser() authedSeller: AuthenticatedUser, 
    @Body() dto: UpdateProductDto, 
    @UploadedFile() cardImage?: Express.Multer.File
  ): Promise<ProductForSellerPreviewResponseDto> {
    return this.productForSellerService.updateProduct(productId, authedSeller, dto, cardImage);
  }


  @ApiOperation({summary: 'удаление продукта продавцом'})
  @ApiProductIdParam()
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @Delete('/:productId')
  deleteProduct(@Param('productId') productId: string, @GetUser() authedSeller: AuthenticatedUser): Promise<MessageResponseDto> {
    return this.productForSellerService.deleteProduct(productId, authedSeller);
  }


  @ApiOperation({summary: 'получение списка продуктов продавцом с пагинацией'})
  @ApiOkResponse({type: ProductForSellerPreviewResponseDto})
  // ====================================================
  @Get('/')
  getAllSellerProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise< PaginatedResponseDto<ProductForSellerPreviewResponseDto> > {
    return this.productForSellerService.getAllSellerProducts(authedSeller, paginationQuery);
  }


  @ApiOperation({summary: 'получение полного продукта продавца'})
  @ApiProductIdParam()
  @ApiOkResponse({type: ProductForSellerFullResponseDto})
  // ====================================================
  @Get('/:productId')
  getSellerProduct(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string
  ): Promise<ProductForSellerFullResponseDto> {
    return this.productForSellerService.getSellerProduct(authedSeller, productId);
  }

  @ApiOperation({summary: 'получение списка логов продукта продавца с пагинацией'})
  @ApiProductIdParam()
  @ApiOkResponse({type: PaginatedLogDto})
  // ====================================================
  @Get('/:productId/logs')
  getSellerProductLogs(
    @GetUser() authedSeller: AuthenticatedUser, 
    @Param('productId') productId: string, 
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.productForSellerService.getSellerProductLogs(authedSeller, productId, paginationQuery);
  }





}
