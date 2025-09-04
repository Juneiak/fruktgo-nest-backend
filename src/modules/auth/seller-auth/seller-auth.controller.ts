import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SellerAuthService } from './seller-auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  SellerAuthResponseDto,
  ShopAuthResponseDto,
  LoginCodeForSellerResponseDto,
  LoginCodeForShopResponseDto,
} from './seller-auth.response.dto';

@Controller('')
export class SellerAuthController {
  constructor(private readonly sellerAuthService: SellerAuthService) {}
  
  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа продавца в свою панель управления'})
  @Get('auth/seller/login-code')
  getLoginCodeForSeller(): Promise<LoginCodeForSellerResponseDto> {
    return this.sellerAuthService.generateLoginCodeForSeller();
  }


  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа в панель управления магазина'})
  @Get('auth/shop/login-code')
  getLoginCodeForShop(): Promise<LoginCodeForShopResponseDto> {
    return this.sellerAuthService.generateLoginCodeForShop();
  }


  @ApiTags('for seller')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего продавца'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/seller/me')
  getSellerProfile(@GetUser() authedSeller: AuthenticatedUser): Promise<SellerAuthResponseDto> {
    return this.sellerAuthService.checkSellerAuth(authedSeller);
  }


  @ApiTags('for shop')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего магазина'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/shop/me')
  getShopProfile(@GetUser() authedShop: AuthenticatedUser): Promise<ShopAuthResponseDto> {
    return this.sellerAuthService.checkShopAuth(authedShop);
  }
}