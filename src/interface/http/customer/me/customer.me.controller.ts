import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards } from '@nestjs/common';
import { CustomerResponseDto } from './customer.me.response.dtos';
import { CreateAddressDto, UpdateCustomerDto } from './customer.me.request.dtos';
import { CustomerMeRoleService } from './customer.me.role.service'; 
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerMeController {
  constructor(private readonly customerMeRoleService: CustomerMeRoleService) {}


  @ApiOperation({summary: 'Добавление нового адреса клиентом'})
  @Post('address')
  addAddress( 
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: CreateAddressDto
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.addAddress(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Удаление сохраненного адреса клиентом по его addressId'})
  @Delete('address/:addressId')
  deleteAddress(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('addressId') addressId: string
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.deleteSavedAddress(authedCustomer, addressId);
  }


  @ApiOperation({summary: 'Выбор сохраненного адреса клиентом по его addressId'})
  @Patch('address/:addressId')
  selectAddress(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('addressId') addressId: string
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.selectAddress(authedCustomer, addressId);
  }


  @ApiOperation({summary: 'Получение информации о клиенте по своему customerId'})
  @Get()
  getCustomer(@GetUser() authedCustomer: AuthenticatedUser): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.getCustomer(authedCustomer);
  }


  @ApiOperation({summary: 'Обновление информации о клиенте по своему customerId'})
  @Patch()
  updateCustomer(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: UpdateCustomerDto
  ): Promise<CustomerResponseDto> {
    return this.customerMeRoleService.updateCustomer(authedCustomer, dto);
  }
  
}
