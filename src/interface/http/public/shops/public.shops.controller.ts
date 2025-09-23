import { Controller, Get, Param } from '@nestjs/common';
import { PublicShopsRoleService } from './public.shops.role.service';
import { 
  ShopFullResponseDto,
  ShopPreviewResponseDto,
} from './public.shops.response.dtos'; 
import { ApiTags, ApiOperation} from '@nestjs/swagger';

@ApiTags('for public')
@Controller()
export class PublicShopsController {
  constructor(private readonly publicShopsRoleService: PublicShopsRoleService) {}


  @ApiOperation({summary: 'Возвращает список превью информации о всех публичных магазинах'})
  @Get()
  getPublicShops(): Promise<ShopPreviewResponseDto[]> {
    return this.publicShopsRoleService.getPublicShops();
  }


  @ApiOperation({summary: 'Возвращает полную публичную информацию о магазине по его shopId'})
  @Get(':shopId')
  getPublicShop(@Param('shopId') shopId: string): Promise<ShopFullResponseDto> {
    return this.publicShopsRoleService.getPublicShop(shopId);
  }
}
