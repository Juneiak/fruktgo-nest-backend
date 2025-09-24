import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SellerAuthRoleService } from './seller.auth.role.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import {
  SellerAuthResponseDto,
  LoginCodeForSellerResponseDto,
} from './seller.auth.response.dtos';

@Controller('')
export class SellerAuthController {
  constructor(private readonly sellerAuthRoleService: SellerAuthRoleService) {}
  
  @ApiTags('for public')
  @ApiOperation({summary: 'Получить код для входа продавца в свою панель управления'})
  @Get('auth/seller/login-code')
  getLoginCodeForSeller(): Promise<LoginCodeForSellerResponseDto> {
    return this.sellerAuthRoleService.generateLoginCodeForSeller();
  }


  @ApiTags('for seller')
  @ApiOperation({summary: 'Проверить токен и получить данные текущего продавца'})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('auth/seller/me')
  getSellerProfile(
    @GetUser() authedSeller: AuthenticatedUser
  ): Promise<SellerAuthResponseDto> {
    return this.sellerAuthRoleService.checkSellerAuth(authedSeller);
  }
}