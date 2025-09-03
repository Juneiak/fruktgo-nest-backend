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
} from 'src/modules/order/shop/order.shop.request.dto';
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
import { OrderForShopService } from 'src/modules/order/shop/order.shop.service'
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
  // ORDERS
  // ====================================================
  @ApiOperation({summary: 'получние всех заказов магазина'})
  @Get('/orders')
  getOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopPreviewResponseDto[]> {
    return this.orderForShopService.getOrders(authedShop);
  }


  @ApiOperation({summary: 'получние всех активных заказов магазина'})
  @Get('/orders/active')
  getActiveOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopPreviewResponseDto[]> {
    return this.orderForShopService.getActiveOrders(authedShop);
  }


  @ApiOperation({summary: 'получние конкретного заказа магазина'})
  @Get('/orders/:orderId')
  getOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderForShopFullResponseDto> {
    return this.orderForShopService.getOrder(authedShop, orderId);
  }


  @ApiOperation({summary: 'принять заказ'})
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
