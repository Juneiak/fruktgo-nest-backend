import { Controller, Get, UseGuards, Param, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ShopOrdersRoleService } from './shop.orders.role.service';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { OrderFullResponseDto, OrderPreviewResponseDto } from './shop.orders.response.dtos';
import { EmployeeAuthGuard } from 'src/common/guards/employee-auth.guard';
import { GetEmployee } from 'src/common/decorators/employee.decorator';
import { AuthenticatedEmployee } from 'src/common/types';
import {
  DeclineOrderByEmployeeDto,
  PrepareOrderProductByEmployeeDto,
  CompleteOrderAssemblyByEmployeeDto,
  HandOrderToCourierByEmployeeDto
 } from './shop.orders.request.dtos';


@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopOrdersController {
  constructor(
    private readonly shopOrdersRoleService: ShopOrdersRoleService,
  ) {} 

  @ApiOperation({summary: 'получние всех заказов магазина'})
  @Get()
  getOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderPreviewResponseDto[]> {
    return this.shopOrdersRoleService.getOrders(authedShop);
  }


  @ApiOperation({summary: 'получние всех активных заказов магазина'})
  @Get('active')
  getActiveOrders(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderPreviewResponseDto[]> {
    return this.shopOrdersRoleService.getActiveOrders(authedShop);
  }


  @ApiOperation({summary: 'получние конкретного заказа магазина'})
  @Get(':orderId')
  getOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.getOrder(authedShop, orderId);
  }


  @ApiOperation({summary: 'принять заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch(':orderId/accept')
  acceptOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.acceptOrderByEmployee(authedShop, authedEmployee, orderId);
  }

  
  @ApiOperation({summary: 'отклонить заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch(':orderId/decline')
  cancelOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: DeclineOrderByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.declineOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'подготовить заказ'})
  @UseGuards(EmployeeAuthGuard)
  @Patch(':orderId/prepare')
  prepareOrder(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: PrepareOrderProductByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.prepareOrderByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'завершить сбор заказа'})
  @UseGuards(EmployeeAuthGuard)
  @Patch(':orderId/assembly')
  completeOrderAssembly(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: CompleteOrderAssemblyByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.completeOrderAssemblyByEmployee(authedShop, authedEmployee, orderId, dto);
  }


  @ApiOperation({summary: 'передать заказ курьеру'})
  @UseGuards(EmployeeAuthGuard)
  @Patch(':orderId/handed-to-courier')
  handOrderToCourier(
    @Param('orderId') orderId: string,
    @GetUser() authedShop: AuthenticatedUser,
    @GetEmployee() authedEmployee: AuthenticatedEmployee,
    @Body() dto: HandOrderToCourierByEmployeeDto
  ): Promise<OrderFullResponseDto> {
    return this.shopOrdersRoleService.handOrderToCourierByEmployee(authedShop, authedEmployee, orderId, dto);
  }
}
