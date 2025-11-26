import { Controller, Patch, Body, Get, UseGuards } from '@nestjs/common';
import { 
  CartResponseDto, 
  UpdatedCartResponseDto
} from './customer.cart.response.dtos';
import {
  SelectShopForCartDto,
  UpdateProductInCartDto,
  RemoveProductInCartDto
} from './customer.cart.request.dtos';

import { CustomerCartRoleService } from './customer.cart.role.service'
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { MessageResponseDto } from 'src/interface/http/shared';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerCartController {
  constructor(private readonly customerCartRoleService: CustomerCartRoleService) {}

  @ApiOperation({summary: 'Получение корзины'})
  @Get()
  getCustomerCart(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<CartResponseDto> {
    return this.customerCartRoleService.getCustomerCart(authedCustomer);
  }
  

  @ApiOperation({summary: 'Выбор магазина для корзины'})
  @Patch('select-shop')
  selectShopForCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: SelectShopForCartDto
  ): Promise<CartResponseDto> {
    return this.customerCartRoleService.selectShopForCart(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Убрать магазин для корзины'})
  @Patch('unselect-shop')
  unselectShopForCart(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    return this.customerCartRoleService.unselectShopForCart(authedCustomer);
  }


  @ApiOperation({summary: 'Добавить или обновить продукт в корзине'})
  @Patch('update-product')
  updateProductInCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: UpdateProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    return this.customerCartRoleService.updateProductInCart(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Убрать продукт из корзины'})
  @Patch('remove-product')
  removeProductInCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: RemoveProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    return this.customerCartRoleService.removeProductInCart(authedCustomer, dto);
  }
  
}
