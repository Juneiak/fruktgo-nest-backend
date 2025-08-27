import { Controller, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SellerAuthService } from './seller-auth.service';
import { LoginCodeForShopDto, LoginCodeForSellerDto } from './seller-auth.dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { SellerAuthDto, ShopAuthDto } from './seller-auth.dtos';

@Controller('')
export class SellerAuthController {
  constructor(private readonly sellerAuthService: SellerAuthService) {}
  
  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа продавца в свою панель управления'})
  @ApiOkResponse({type: LoginCodeForSellerDto})
  // ====================================================
  @Get('auth/seller/login-code')
  getLoginCodeForSeller(): Promise<LoginCodeForSellerDto> {
    return this.sellerAuthService.generateLoginCodeForSeller();
  }

  @ApiTags('for seller')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего продавца'})
  @ApiOkResponse({type: SellerAuthDto})
  @ApiBearerAuth()
  // ====================================================
  @UseGuards(JwtAuthGuard)
  @Get('auth/seller/me')
  getSellerProfile(@GetUser() authedSeller: AuthenticatedUser): Promise<SellerAuthDto> {
    return this.sellerAuthService.checkSellerAuth(authedSeller);
  }
  


  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа в панель управления магазина'})
  @ApiOkResponse({type: LoginCodeForShopDto})
  // ====================================================
  @Get('auth/shop/login-code')
  getLoginCodeForShop(): Promise<LoginCodeForShopDto> {
    return this.sellerAuthService.generateLoginCodeForShop();
  }


  @ApiTags('for shop')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего магазина'})
  @ApiOkResponse({type: ShopAuthDto})
  @ApiBearerAuth()
  // ====================================================
  @UseGuards(JwtAuthGuard)
  @Get('auth/shop/me')
  getShopProfile(@GetUser() authedShop: AuthenticatedUser): Promise<ShopAuthDto> {
    return this.sellerAuthService.checkShopAuth(authedShop);
  }
}