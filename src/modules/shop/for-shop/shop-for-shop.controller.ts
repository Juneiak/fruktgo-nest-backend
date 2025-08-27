import { Controller, Patch, Body, Get, Param, UseGuards, Delete, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ShopForShopService } from './shop-for-shop.service';
import { 
  ShopForShopPreviewResponseDto,
  ShopProductForShopPreviewResponseDto,
  ShopProductForShopFullResponseDto,
  UpdateShopProductByEmployeeDto,
  OpenShiftByEmployeeDto,
  CloseShiftByEmployeeDto,
  RemoveShopProductImageDto,
  CurrentShopProductsStockDto,
  CurrentShopProductStockResponseDto
} from './shops-for-shop.dtos';
import { MessageResponseDto } from 'src/common/dtos';
import {
  OrderForShopPreviewResponseDto,
  OrderForShopFullResponseDto,
  DeclineOrderByEmployeeDto,
  PrepareOrderProductByEmployeeDto,
  CompleteOrderAssemblyByEmployeeDto,
  HandOrderToCourierByEmployeeDto,
} from 'src/modules/order/for-shop/order-for-shop.dtos';
import {OrderProductResponseDto} from 'src/modules/order/order.dtos'
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation, ApiBody} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedUser, AuthenticatedEmployee } from 'src/common/types';
import { ApiShopIdParam, ApiShopProductIdParam, ApiShiftIdParam, ApiImageIdParam, ApiOrderIdParam } from 'src/common/swagger';
import { ApiFormData } from 'src/common/swagger/api-form-data.decorator';
import { OrderForShopService } from 'src/modules/order/for-shop/order-for-shop.service'
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shops/for-shop')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopForShopController {
  constructor(
    private readonly shopForShopService: ShopForShopService,
    private readonly orderForShopService: OrderForShopService,
  ) {}

  // ====================================================
  // COMMON 
  // ====================================================
  @ApiOperation({summary: 'возвращает общую информацию о магазине для магазина'})
  @ApiOkResponse({type: ShopForShopPreviewResponseDto})
  // ====================================================
  @Get('/')
  getShopPreviewInfo(@GetUser() authedShop: AuthenticatedUser): Promise<ShopForShopPreviewResponseDto> {
    return this.shopForShopService.getShopPreviewInfo(authedShop);
  }



  // ====================================================
  // SHOP PRODUCTS 
  // ====================================================
  @ApiOperation({summary: 'Получение продукта из магазина для магазина'})
  @ApiShopProductIdParam()
  @ApiOkResponse({type: ShopProductForShopFullResponseDto})
  // ====================================================
  @Get('/shop-products/:shopProductId')
  getShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @Param('shopProductId') shopProductId: string,
  ): Promise<ShopProductForShopFullResponseDto> {
    return this.shopForShopService.getShopProduct(authedShop, shopProductId);
  }


  @ApiOperation({summary: 'Получение всех продуктов из магазина для магазина'})
  @ApiOkResponse({type: ShopProductForShopPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/shop-products')
  getShopProducts(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<ShopProductForShopPreviewResponseDto[]> {
    return this.shopForShopService.getShopProducts(authedShop);
  }


  @ApiOperation({summary: 'Изменение кол-во и/или статуса существующего продукта в магазине закрепленным сотрудником'})
  @ApiBody({type: UpdateShopProductByEmployeeDto})
  @ApiShopProductIdParam()
  @ApiOkResponse({type: ShopProductForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/shop-products/:shopProductId')
  updateShopProduct(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Param('shopProductId') shopProductId: string,
    @Body() dto: UpdateShopProductByEmployeeDto
  ): Promise<ShopProductForShopFullResponseDto> {
    return this.shopForShopService.updateShopProduct(authedShop, authedEmployee, shopProductId, dto);
  }


  @ApiOperation({summary: 'Удаление изображения продукта в магазине'})
  @ApiShopProductIdParam()
  @ApiImageIdParam()
  @ApiBody({type: RemoveShopProductImageDto})
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Delete('/shop-products/:shopProductId/images/:imageId')
  removeShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @Param('imageId') imageId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: RemoveShopProductImageDto
  ): Promise<MessageResponseDto> {
    return this.shopForShopService.removeShopProductImage(authedShop, authedEmployee, shopProductId, imageId, dto);
  }


  @ApiOperation({summary: 'Добавление изображения продукта в магазин'})
  @ApiShopProductIdParam()
  @ApiFormData('newShopProductImage', true)
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Post('/shop-products/:shopProductId/images')
  @UseInterceptors(ImageUploadInterceptor('newShopProductImage'))
  addNewShopProductImage(
    @Param('shopProductId') shopProductId: string,
    @UploadedFile() newShopProductImage: Express.Multer.File,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
  ): Promise<ShopProductForShopFullResponseDto> {
    return this.shopForShopService.addNewShopProductImage(authedShop, authedEmployee, shopProductId, newShopProductImage);
  }


  @ApiOperation({summary: 'получить список наличие данных продуктов в магазине'})
  @ApiBody({type: CurrentShopProductsStockDto})
  @ApiOkResponse({type: CurrentShopProductStockResponseDto, isArray: true})
  // ====================================================
  @Post('/shop-products/stock')
  getShopProductStock(
    @GetUser() authedShop: AuthenticatedUser,
    @Body() dto: CurrentShopProductsStockDto
  ): Promise<CurrentShopProductStockResponseDto[]> {
    return this.shopForShopService.getShopProductStock(authedShop, dto);
  }


  
  // ====================================================
  // SHIFT
  // ====================================================
  @ApiOperation({summary: 'открытие смены сотрудником'})
  @ApiBody({type: OpenShiftByEmployeeDto})
  @ApiOkResponse({type: ShopForShopPreviewResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Post('/shifts')
  openShift(
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: OpenShiftByEmployeeDto
  ): Promise<ShopForShopPreviewResponseDto> {
    return this.shopForShopService.openShiftByEmployee(authedShop, authedEmployee, dto);
  }

  @ApiOperation({summary: 'закрытие смены сотрудником'})
  @ApiShiftIdParam()
  @ApiBody({type: CloseShiftByEmployeeDto})
  @ApiOkResponse({type: ShopForShopPreviewResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Delete('/shifts/:shiftId')
  closeShift(
    @Param('shiftId') shiftId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CloseShiftByEmployeeDto
  ): Promise<ShopForShopPreviewResponseDto> {
    return this.shopForShopService.closeShiftByEmployee(authedShop, authedEmployee, shiftId, dto);
  }

  

  // ====================================================
  // ORDERS
  // ====================================================
  @ApiOperation({summary: 'получние всех заказов магазина'})
  @ApiOkResponse({type: OrderForShopPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/orders')
  getOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopPreviewResponseDto[]> {
    return this.orderForShopService.getOrders(authedShop);
  }


  @ApiOperation({summary: 'получние всех активных заказов магазина'})
  @ApiOkResponse({type: OrderForShopPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/orders/active')
  getActiveOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopPreviewResponseDto[]> {
    return this.orderForShopService.getActiveOrders(authedShop);
  }


  @ApiOperation({summary: 'получние конкретного заказа магазина'})
  @ApiOrderIdParam()
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @Get('/orders/:orderId')
  getOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.getOrder(authedShop, orderId);
  }


  @ApiOperation({summary: 'принять заказ'})
  @ApiOrderIdParam()
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/orders/:orderId/accept')
  acceptOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.acceptOrderByEmployee(authedShop, authedEmployee, orderId);
  }

  
  @ApiOperation({summary: 'отклонить заказ'})
  @ApiOrderIdParam()
  @ApiBody({type: DeclineOrderByEmployeeDto})
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/orders/:orderId/decline')
  cancelOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: DeclineOrderByEmployeeDto
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.declineOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'подготовить заказ'})
  @ApiOrderIdParam()
  @ApiBody({type: PrepareOrderProductByEmployeeDto})
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/orders/:orderId/prepare')
  prepareOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: PrepareOrderProductByEmployeeDto
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.prepareOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'завершить сбор заказа'})
  @ApiOrderIdParam()
  @ApiBody({type: CompleteOrderAssemblyByEmployeeDto})
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/orders/:orderId/assembly')
  completeOrderAssembly(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CompleteOrderAssemblyByEmployeeDto
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.completeOrderAssemblyByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'передать заказ курьеру'})
  @ApiOrderIdParam()
  @ApiBody({type: HandOrderToCourierByEmployeeDto})
  @ApiOkResponse({type: OrderForShopFullResponseDto})
  // ====================================================
  @UseGuards(EmployeeAuthGuard)
  @Patch('/orders/:orderId/handed-to-courier')
  handOrderToCourier(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: HandOrderToCourierByEmployeeDto
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.handOrderToCourierByEmployee(authedShop, authedEmployee, orderId, dto);
  }


}
