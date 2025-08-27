import { Controller, Patch, Body, Get, Param, UseGuards,  } from '@nestjs/common';
import { 
  SelectShopForCartDto, 
  CartResponseDto, 
  UpdateProductInCartDto,
  RemoveProductInCartDto,
  UpdatedCartResponseDto
} from './cart-for-customer.dtos';
import { CartForCustomerService } from './cart-for-customer.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ApiCustomerIdParam } from 'src/common/swagger';
import { AuthenticatedUser } from 'src/common/types';
import { GetUser } from 'src/common/decorators/user.decorator';
import { MessageResponseDto } from 'src/common/dtos';

@ApiTags('for customer')
@ApiBearerAuth('JWT-auth')
@Controller('customers/for-customer')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('customer')
export class CartForCustomerController {
  constructor(private readonly cartForCustomerService: CartForCustomerService) {}


  // ====================================================
  // CART 
  // ====================================================

  @ApiOperation({summary: 'Получение корзины'})
  @ApiOkResponse({type: CartResponseDto})
  // ====================================================
  @Get('/cart')
  getCustomerCart(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<CartResponseDto> {
    return this.cartForCustomerService.getCustomerCart(authedCustomer);
  }
  

  @ApiOperation({summary: 'Выбор магазина для корзины'})
  @ApiOkResponse({type: CartResponseDto})
  @ApiBody({ type: SelectShopForCartDto })
  // ====================================================
  @Patch('/cart/select-shop')
  selectShopForCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: SelectShopForCartDto
  ): Promise<CartResponseDto> {
    return this.cartForCustomerService.selectShopForCart(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Убрать магазин для корзины'})
  @ApiOkResponse({type: MessageResponseDto})
  // ====================================================
  @Patch('/cart/unselect-shop')
  unselectShopForCart(
    @GetUser() authedCustomer: AuthenticatedUser
  ): Promise<MessageResponseDto> {
    return this.cartForCustomerService.unselectShopForCart(authedCustomer);
  }


  @ApiOperation({summary: 'Добавить или обновить продукт в корзине'})
  @ApiOkResponse({type: UpdatedCartResponseDto})
  @ApiBody({ type: UpdateProductInCartDto })
  // ====================================================
  @Patch('/cart/update-product')
  updateProductInCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: UpdateProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    return this.cartForCustomerService.updateProductInCart(authedCustomer, dto);
  }


  @ApiOperation({summary: 'Убрать продукт из корзины'})
  @ApiOkResponse({type: UpdatedCartResponseDto})
  @ApiBody({ type: RemoveProductInCartDto })
  // ====================================================
  @Patch('/cart/remove-product')
  removeProductInCart(
    @GetUser() authedCustomer: AuthenticatedUser, 
    @Body() dto: RemoveProductInCartDto
  ): Promise<UpdatedCartResponseDto> {
    return this.cartForCustomerService.removeProductInCart(authedCustomer, dto);
  }
  
}
