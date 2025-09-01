import { Controller, Get, Post, Body, Param, Patch, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query, UseGuards } from '@nestjs/common';
import { ShopForSellerService } from './shop-for-seller.service';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";
import { 
  ShopForSellerPreviewResponseDto,
  ShopForSellerFullResponseDto,
  UpdateShopProductBySellerDto,
  ShopProductForSellerResponseDto,
  ShiftForSellerPreviewResponseDto,
  ShiftForSellerFullResponseDto,
  CreateShopDto,
  UpdateShopDto,
  UpdateShopFormDataDto,
  CreateShopFormDataDto
} from './shops-for-seller.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation, ApiBody} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { ApiShopIdParam, ApiShopProductIdParam, ApiShiftIdParam, ApiImageIdParam, ApiEmployeeIdParam, ApiOrderIdParam} from 'src/common/swagger';
import { MessageResponseDto } from 'src/common/dtos';
import {EmployeeForSellerResponseDto} from 'src/modules/employee/seller/employee.seller.response.dtos'
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ApiFormData } from 'src/common/swagger/api-form-data.decorator';
import { OrderPreviewResponseForSellerDto, OrderFullResponseForSellerDto } from 'src/modules/order/for-seller/order-for-seller.dtos';
import { OrderForSellerService } from 'src/modules/order/for-seller/order-for-seller.service';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@ApiTags('for seller')
@ApiBearerAuth('JWT-auth')
@Controller('shops/for-seller')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('seller')
export class ShopForSellerController {
  constructor(
    private readonly shopForSellerService: ShopForSellerService,
    private readonly orderForSellerService: OrderForSellerService
  ) {}

  // ====================================================
  // SHOPS 
  // ====================================================
  @ApiOperation({summary: 'создание магазина продавцом'})
  @ApiFormData('shopImage', true, CreateShopFormDataDto)
  @ApiOkResponse({type: ShopForSellerPreviewResponseDto})
  // ====================================================
  @Post('/')
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  createShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: CreateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopForSellerPreviewResponseDto> {
    return this.shopForSellerService.createShop(authedSeller, dto, shopImage);
  }


  @ApiOperation({summary: 'редактирует информацию о магазине'})
  @ApiShopIdParam()
  @ApiFormData('shopImage', true, UpdateShopFormDataDto)
  @ApiOkResponse({type: ShopForSellerFullResponseDto})
  // ====================================================
  @Patch('/:shopId')
  @UseInterceptors(ImageUploadInterceptor('shopImage'))
  updateShop(
    @Param('shopId') shopId: string, 
    @GetUser() authedSeller: AuthenticatedUser, 
    @Body() dto: UpdateShopDto,
    @UploadedFile() shopImage?: Express.Multer.File
  ): Promise<ShopForSellerFullResponseDto> {
    return this.shopForSellerService.updateShop(authedSeller, shopId, dto, shopImage);
  }


  @ApiOperation({summary: 'возвращает полную информацию о магазине'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopForSellerFullResponseDto})
  // ====================================================
  @Get('/:shopId')
  getShop(@GetUser() authedSeller: AuthenticatedUser, @Param('shopId') shopId: string): Promise<ShopForSellerFullResponseDto> {
    return this.shopForSellerService.getFullShop(authedSeller, shopId);
  }


  @ApiOperation({summary: 'возвращает краткую информацию о магазине'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopForSellerPreviewResponseDto})
  // ====================================================
  @Get('/:shopId/preview')
  getShopPreview(@GetUser() authedSeller: AuthenticatedUser, @Param('shopId') shopId: string): Promise<ShopForSellerPreviewResponseDto> {
    return this.shopForSellerService.getPreviewShop(authedSeller, shopId);
  }



  @ApiOperation({summary: 'Возвращает список превью информации о магазинах'})
  @ApiOkResponse({type: ShopForSellerPreviewResponseDto, isArray: true })
  // ====================================================
  @Get('/')
  getShops(@GetUser() authedSeller: AuthenticatedUser): Promise<ShopForSellerPreviewResponseDto[]> {
    return this.shopForSellerService.getShops(authedSeller);
  }



  // ====================================================
  // SHIFT
  // ====================================================
  @ApiOperation({summary: 'Возвращает список смен с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShiftForSellerPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/:shopId/shifts')
  getShifts(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftForSellerPreviewResponseDto>> {
    return this.shopForSellerService.getShifts(authedSeller, shopId, paginationQuery);
  }

  @ApiOperation({summary: 'Возвращает последнюю смену'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShiftForSellerFullResponseDto})
  // ====================================================
  @Get('/:shopId/shifts/current')
  getCurrentShift(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<ShiftForSellerFullResponseDto> {
    return this.shopForSellerService.getCurrentShift(authedSeller, shopId);
  }


  @ApiOperation({summary: 'Возвращает смену'})
  @ApiShopIdParam()
  @ApiShiftIdParam()
  @ApiOkResponse({type: ShiftForSellerFullResponseDto})
  // ====================================================
  @Get('/:shopId/shifts/:shiftId')
  getShift(
    @Param('shiftId') shiftId: string,
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<ShiftForSellerFullResponseDto> {
    return this.shopForSellerService.getShift(authedSeller, shopId, shiftId);
  }

  @ApiOperation({summary: 'Возвращает логи смены'})
  @ApiShopIdParam()
  @ApiShiftIdParam()
  @ApiOkResponse({type: PaginatedLogDto})
  // ====================================================
  @Get('/:shopId/shifts/:shiftId/logs')
  getShiftLogs(
    @Param('shiftId') shiftId: string,
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopForSellerService.getShiftLogs(authedSeller, shopId, shiftId, paginationQuery);
  }



  // ====================================================
  // EMPLOYEES
  // ====================================================
  @ApiOperation({summary: 'Возвращает закрепленных сотрудников'})
  @ApiShopIdParam()
  @ApiOkResponse({type: EmployeeForSellerResponseDto, isArray: true})
  // ====================================================
  @Get('/:shopId/employees')
  getPinnedEmployees(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<EmployeeForSellerResponseDto[]> {
    return this.shopForSellerService.getPinnedEmployees(shopId, authedSeller);
  }

  @ApiOperation({summary: 'Открепить сотрудника от магазина'})
  @ApiShopIdParam()
  @ApiEmployeeIdParam()
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @Delete('/:shopId/employees/:employeeId')
  unpinEmployeeFromShop(
    @Param('shopId') shopId: string,
    @Param('employeeId') employeeId: string,
    @GetUser() authedSeller: AuthenticatedUser,
  ): Promise<MessageResponseDto> {
    return this.shopForSellerService.unpinEmployeeFromShop(shopId, employeeId, authedSeller);
  }



  // ====================================================
  // SHOP PRODUCTS 
  // ====================================================
  @ApiOperation({summary: 'Получение всех продуктов из магазина с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopProductForSellerResponseDto, isArray: true})
  // ====================================================
  @Get('/:shopId/shop-products')
  getShopProducts(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductForSellerResponseDto>> {
    return this.shopForSellerService.getShopProducts(authedSeller, shopId, paginationQuery);
  }


  @ApiOperation({summary: 'Получение продукта из магазина'})
  @ApiShopIdParam()
  @ApiShopProductIdParam()
  @ApiOkResponse({type: ShopProductForSellerResponseDto})
  // ====================================================
  @Get('/:shopId/shop-products/:shopProductId')
  getShopProduct(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string
  ): Promise<ShopProductForSellerResponseDto> {
    return this.shopForSellerService.getShopProduct(authedSeller, shopId, shopProductId);
  }

  @ApiOperation({summary: 'Получение логов продукта из магазина'})
  @ApiShopIdParam()
  @ApiShopProductIdParam()
  @ApiOkResponse({type: PaginatedLogDto})
  // ====================================================
  @Get('/:shopId/shop-products/:shopProductId/logs')
  getShopProductLogs(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.shopForSellerService.getShopProductLogs(authedSeller, shopId, shopProductId, paginationQuery);
  }

  
  @ApiOperation({summary: 'изменение кол-во и/или статуса продукта в магазине'})
  @ApiShopIdParam()
  @ApiBody({type: UpdateShopProductBySellerDto})
  @ApiOkResponse({type: ShopProductForSellerResponseDto})
  // ====================================================
  @Patch('/:shopId/shop-products')
  updateShopProduct(
    @Param('shopId') shopId: string,
    @GetUser() authedSeller: AuthenticatedUser,
    @Body() dto: UpdateShopProductBySellerDto
  ): Promise<ShopProductForSellerResponseDto> {
    return this.shopForSellerService.updateShopProduct(authedSeller, shopId, dto);
  }


  @ApiOperation({summary: 'Удаление продукта из магазина'})
  @ApiShopIdParam()
  @ApiShopProductIdParam()
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @Delete('/:shopId/shop-products/:shopProductId')
  removeProductFromShop(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string
  ): Promise<MessageResponseDto> {
    return this.shopForSellerService.removeProductFromShop(authedSeller, shopId, shopProductId);
  }


  @ApiOperation({summary: 'Удаление фото продукта из магазина'})
  @ApiShopIdParam()
  @ApiShopProductIdParam()
  @ApiImageIdParam()
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @Delete('/:shopId/shop-products/:shopProductId/images/:imageId')
  removeShopProductImage(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
    @Param('shopId') shopId: string,
    @Param('imageId') imageId: string
  ): Promise<MessageResponseDto> {
    return this.shopForSellerService.removeShopProductImage(authedSeller, shopId, shopProductId, imageId);
  }



  // ====================================================
  // ORDERS
  // ====================================================
  @ApiOperation({summary: 'Получение всех заказов из магазина с пагинацией'})
  @ApiShopIdParam()
  @ApiOkResponse({type: OrderPreviewResponseForSellerDto, isArray: true})
  // ====================================================
  @Get('/:shopId/orders')
  getOrders(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<OrderPreviewResponseForSellerDto>> {
    return this.orderForSellerService.getOrders(authedSeller, shopId, paginationQuery);
  }

  @ApiOperation({summary: 'Получение заказа из магазина'})
  @ApiShopIdParam()
  @ApiOrderIdParam()
  @ApiOkResponse({type: OrderFullResponseForSellerDto})
  // ====================================================
  @Get('/:shopId/orders/:orderId')
  getOrder(
    @GetUser() authedSeller: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Param('orderId') orderId: string
  ): Promise<OrderFullResponseForSellerDto> {
    return this.orderForSellerService.getOrder(authedSeller, shopId, orderId);
  }
}
