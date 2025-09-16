import { Controller, Get, Param } from '@nestjs/common';
import { ShopPublicService } from './shop.public.service';
import { 
  ShopFullResponseDto,
  ShopPreviewResponseDto,
} from './shop.public.response.dtos'; 
import { ApiTags, ApiOperation} from '@nestjs/swagger';

@ApiTags('for public')
@Controller('public/shops')
export class ShopPublicController {
  constructor(private readonly shopPublicService: ShopPublicService) {}


  @ApiOperation({summary: 'Возвращает список превью информации о всех публичных магазинах'})
  @Get('/')
  getPublicShops(): Promise<ShopPreviewResponseDto[]> {
    return this.shopPublicService.getPublicShops();
  }


  @ApiOperation({summary: 'Возвращает полную публичную информацию о магазине по его shopId'})
  @Get('/:shopId')
  getPublicShop(@Param('shopId') shopId: string): Promise<ShopFullResponseDto> {
    return this.shopPublicService.getPublicShop(shopId);
  }
}
