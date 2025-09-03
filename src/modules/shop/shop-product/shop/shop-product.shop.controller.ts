import { Controller, Patch, Body, Get, Param, UseGuards, Delete, Post, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { MessageResponseDto } from 'src/common/dtos';

import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ShopProductStockQueryFilterDto } from './shop-product.shop.filter.dto';
import { ShopProductShopService } from './shop-product.shop.service';
import {
  ShopProductFullResponseDto,
  ShopProductPreviewResponseDto,
  CurrentShopProductStockResponseDto
} from './shop-product.shop.response.dto';
import { RemoveShopProductImageDto } from './shop-product.shop.request.dto';
import { UpdateShopProductByEmployeeDto } from './shop-product.shop.request.dto';


@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shop/me')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopProductShopController {
  constructor(
    private readonly shopProductShopService: ShopProductShopService,
  ) {}


  @ApiOperation({summary: 'Получение продукта из магазина для магазина'})
  @Get('/shop-products/:shopProductId')
  getShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductFullResponseDto> {
    return this.shopProductShopService.getShopProduct(authedShop, shopProductId);
  }


  @ApiOperation({summary: 'Получение всех продуктов из магазина для магазина'})
  @Get('/shop-products')
  getShopProducts(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<ShopProductPreviewResponseDto[]> {
    return this.shopProductShopService.getShopProducts(authedShop);
  }


  @ApiOperation({summary: 'Изменение кол-во и/или статуса существующего продукта в магазине закрепленным сотрудником'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/shop-products/:shopProductId')
  updateShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('shopProductId') shopProductId: string,
    @Body() dto: UpdateShopProductByEmployeeDto
  ): Promise<ShopProductFullResponseDto> {
    return this.shopProductShopService.updateShopProduct(authedShop, authedEmployee, shopProductId, dto);
  }


  @ApiOperation({summary: 'Удаление изображения продукта в магазине'})
  @UseGuards(EmployeeAuthGuard)
  @Delete('/shop-products/:shopProductId/images/:imageId')
  removeShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @Param('imageId') imageId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: RemoveShopProductImageDto
  ): Promise<MessageResponseDto> {
    return this.shopProductShopService.removeShopProductImage(authedShop, authedEmployee, shopProductId, imageId, dto);
  }


  @ApiOperation({summary: 'Добавление изображения продукта в магазин'})
  @UseGuards(EmployeeAuthGuard)
  @Post('/shop-products/:shopProductId/images')
  @UseInterceptors(ImageUploadInterceptor('newShopProductImage'))
  addNewShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @UploadedFile() newShopProductImage: Express.Multer.File,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
  ): Promise<ShopProductFullResponseDto> {
    return this.shopProductShopService.addNewShopProductImage(authedShop, authedEmployee, shopProductId, newShopProductImage);
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
