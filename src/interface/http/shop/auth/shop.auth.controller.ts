import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShopAuthRoleService } from './shop.auth.role.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  ShopAuthResponseDto,
  LoginCodeForShopResponseDto,
} from './shop.auth.response.dtos';

@Controller('')
export class ShopAuthController {
  constructor(private readonly shopAuthRoleService: ShopAuthRoleService) {}

  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа в панель управления магазина'})
  @Get('auth/shop/login-code')
  getLoginCodeForShop(): Promise<LoginCodeForShopResponseDto> {
    return this.shopAuthRoleService.generateLoginCodeForShop();
  }


  @ApiTags('for shop')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего магазина'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/shop/me')
  getShopProfile(
    @GetUser() authedShop: AuthenticatedUser
  ): Promise<ShopAuthResponseDto> {
    return this.shopAuthRoleService.checkShopAuth(authedShop);
  }
}