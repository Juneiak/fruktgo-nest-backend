import { Controller, Get, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { ShopPreviewResponseDto } from './shop.response.dtos';
import { UserType } from 'src/common/decorators/type.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';

@ApiTags('for shop')
@ApiBearerAuth('JWT-auth')
@Controller('shop/me')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('shop')
export class ShopController {
  constructor(
    private readonly shopService: ShopService,
  ) {}

  @ApiOperation({summary: 'возвращает общую информацию о магазине для магазина'})
  @Get('/')
  getShopPreviewInfo(
    @GetUser() authedShop: AuthenticatedUser,
  ): Promise<ShopPreviewResponseDto> {
    return this.shopService.getShopPreviewInfo(authedShop);
  }

}
