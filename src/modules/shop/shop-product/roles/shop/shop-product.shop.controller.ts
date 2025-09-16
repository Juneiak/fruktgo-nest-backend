import { Controller, Patch, Body, Get, Param, UseGuards, Delete, Post, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { MessageResponseDto, PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';

import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ShopProductStockQueryFilterDto } from './shop-product.shop.filter.dtos';
import { ShopProductShopService } from './shop-product.shop.service';
import {
  ShopProductResponseDto,
  CurrentShopProductStockResponseDto
} from './shop-product.shop.response.dtos';
import { RemoveShopProductImageDto } from './shop-product.shop.request.dtos';
import { UpdateShopProductByEmployeeDto } from './shop-product.shop.request.dtos';


@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shop/shop-products')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopProductShopController {
  constructor(
    private readonly shopProductShopService: ShopProductShopService,
  ) {}


  @ApiOperation({summary: 'Получение всех продуктов из магазина для магазина'})
  @Get('/')
  getShopProducts(
    @GetUser() authedShop: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.shopProductShopService.getShopProducts(authedShop, paginationQuery);
  }


  @ApiOperation({summary: 'Получение продукта из магазина'})
  @Get('/:shopProductId')
  getShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductShopService.getShopProduct(authedShop, shopProductId);
  }


  @ApiOperation({summary: 'Изменение кол-во и/или статуса существующего продукта в магазине закрепленным сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:shopProductId')
  updateShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('shopProductId') shopProductId: string,
    @Body() dto: UpdateShopProductByEmployeeDto
  ): Promise<ShopProductResponseDto> {
    return this.shopProductShopService.updateShopProduct(authedShop, authedEmployee, shopProductId, dto);
  }


  @ApiOperation({summary: 'Добавление изображения продукта в магазин'})
  @UseGuards(EmployeeAuthGuard)
  @Post('/:shopProductId/images')
  @UseInterceptors(ImageUploadInterceptor('newShopProductImage'))
  addNewShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @UploadedFile() newShopProductImage: Express.Multer.File,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
  ): Promise<ShopProductResponseDto> {
    return this.shopProductShopService.addNewShopProductImage(authedShop, authedEmployee, shopProductId, newShopProductImage);
  }


  @ApiOperation({summary: 'Удаление изображения продукта в магазине'})
  @UseGuards(EmployeeAuthGuard)
  @Delete('/:shopProductId/images/:imageId')
  removeShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @Param('imageId') imageId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: RemoveShopProductImageDto
  ): Promise<ShopProductResponseDto> {
    return this.shopProductShopService.removeShopProductImage(authedShop, authedEmployee, shopProductId, imageId, dto);
  }


  @ApiOperation({summary: 'получить список наличие данных продуктов в магазине'})
  @Get('/shop-products/stock')
  getShopProductStock(
    @GetUser() authedShop: AuthenticatedUser,
    @Query() queryFilter: ShopProductStockQueryFilterDto
  ): Promise<CurrentShopProductStockResponseDto[]> {
    return this.shopProductShopService.getShopProductStock(authedShop, queryFilter);
  }
}
