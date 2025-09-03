import { Controller, Get, UseGuards, Param, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import {OrderShopService} from './order.shop.service';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { OrderFullResponseDto, OrderPreviewResponseDto } from './order.shop.response.dto';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedEmployee } from 'src/common/types';
import {
  DeclineOrderByEmployeeDto,
  PrepareOrderProductByEmployeeDto,
  CompleteOrderAssemblyByEmployeeDto,
  HandOrderToCourierByEmployeeDto
 } from './order.shop.request.dto';


@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shops/orders')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class OrderShopController {
  constructor(private readonly orderShopService: OrderShopService) {} 

  @ApiOperation({summary: 'получние всех заказов магазина'})
  @Get('/')
  getOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderPreviewResponseDto[]> {
    return this.orderShopService.getOrders(authedShop);
  }


  @ApiOperation({summary: 'получние всех активных заказов магазина'})
  @Get('/active')
  getActiveOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderPreviewResponseDto[]> {
    return this.orderShopService.getActiveOrders(authedShop);
  }


  @ApiOperation({summary: 'получние конкретного заказа магазина'})
  @Get('/:orderId')
  getOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.getOrder(authedShop, orderId);
  }


  @ApiOperation({summary: 'принять заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:orderId/accept')
  acceptOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.acceptOrderByEmployee(authedShop, authedEmployee, orderId);
  }

  
  @ApiOperation({summary: 'отклонить заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:orderId/decline')
  cancelOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: DeclineOrderByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.declineOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'подготовить заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:orderId/prepare')
  prepareOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: PrepareOrderProductByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.prepareOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'завершить сбор заказа'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:orderId/assembly')
  completeOrderAssembly(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CompleteOrderAssemblyByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.completeOrderAssemblyByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'передать заказ курьеру'})
  @UseGuards(EmployeeAuthGuard)
  @Patch('/:orderId/handed-to-courier')
  handOrderToCourier(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: HandOrderToCourierByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.orderShopService.handOrderToCourierByEmployee(authedShop, authedEmployee, orderId, dto);
  }
}
