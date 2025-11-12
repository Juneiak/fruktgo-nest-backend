import { Controller, Get, UseGuards } from '@nestjs/common';
import { ShopMeRoleService } from './shop.me.role.service';
import { ShopPreviewResponseDto } from './shop.me.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopMeController {
  constructor(
    private readonly shopMeRoleService: ShopMeRoleService
  ) {}

  @ApiOperation({summary: 'Возвращает общую информацию о магазине для магазина'})
  @Get()
  getShopPreviewInfo(
    @GetUser() authedShop: AuthenticatedUser
  ): Promise<ShopPreviewResponseDto> {
    return this.shopMeRoleService.getShopPreviewInfo(authedShop);
  }
}
