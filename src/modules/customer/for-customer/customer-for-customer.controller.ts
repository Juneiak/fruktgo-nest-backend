import { Controller, Delete, Post, Patch, Body, Get, Param, UseGuards,  } from '@nestjs/common';
import { 
  CreateAddressDto, 
  CustomerForCustomerResponseDto,
  UpdateCustomerDto,
  AddressResponseDto
} from './customer-for-customer.dtos';
import { CustomerForCustomerService } from './customer-for-customer.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller('customers/for-customer')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CustomerForCustomerController {
  constructor(private readonly customerForCustomerService: CustomerForCustomerService) {}


  @ApiOperation({summary: 'Добавление нового адреса клиентом'})
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  // ====================================================
  @Post('/address')
  addAddress( 
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: CreateAddressDto
  ): Promise<AddressResponseDto[]> {
    return this.customerForCustomerService.addAddress(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Удаление сохраненного адреса клиентом по его addressId'})
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  // ====================================================
  @Delete('/address/:addressId')
  deleteAddress(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('addressId') addressId: string
  ): Promise<AddressResponseDto[]> {
    return this.customerForCustomerService.deleteSavedAddress(authedCustomer, addressId);
  }


  @ApiOperation({summary: 'Выбор сохраненного адреса клиентом по его addressId'})
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  // ====================================================
  @Patch('/address/:addressId')
  selectAddress(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Param('addressId') addressId: string
  ): Promise<AddressResponseDto[]> {
    return this.customerForCustomerService.selectAddress(authedCustomer, addressId);
  }


  @ApiOperation({summary: 'Получение информации о клиенте по своему customerId'})
  @ApiOkResponse({type: CustomerForCustomerResponseDto})
  // ====================================================
  @Get('/')
  getCustomer(@GetUser() authedCustomer: AuthenticatedUser): Promise<CustomerForCustomerResponseDto> {
    return this.customerForCustomerService.getCustomer(authedCustomer);
  }


  @ApiOperation({summary: 'Обновление информации о клиенте по своему customerId'})
  @ApiBody({ type: UpdateCustomerDto })
  @ApiOkResponse({type: CustomerForCustomerResponseDto})
  // ====================================================
  @Patch('/')
  updateCustomer(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: UpdateCustomerDto
  ): Promise<CustomerForCustomerResponseDto> {
    return this.customerForCustomerService.updateCustomer(authedCustomer, dto);
  }
  
}
