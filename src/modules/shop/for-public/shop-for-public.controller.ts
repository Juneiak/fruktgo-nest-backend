import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ShopForPublicService } from './shop-for-public.service';
import { 
  ShopForPublicFullResponseDto,
  ShopForPublicPreviewResponseDto,
  ShopProductForPublicResponseDto
} from './shop-for-public.dtos'; 
import { ApiOkResponse, ApiTags, ApiOperation} from '@nestjs/swagger';
import { ApiShopIdParam, ApiShopProductIdParam } from 'src/common/swagger';

@ApiTags('for public')
@Controller('shops/for-public')
export class ShopForPublicController {
  constructor(private readonly shopForPublicService: ShopForPublicService) {}


  @ApiOperation({summary: 'Возвращает список превью информации о всех публичных магазинах'})
  @ApiOkResponse({type: ShopForPublicPreviewResponseDto, isArray: true})
  // ====================================================
  @Get('/')
  getPublicShops(): Promise<ShopForPublicPreviewResponseDto[]> {
    return this.shopForPublicService.getPublicShops();
  }


  @ApiOperation({summary: 'Возвращает полную публичную информацию о магазине по его shopId'})
  @ApiShopIdParam()
  @ApiOkResponse({type: ShopForPublicFullResponseDto})
  // ====================================================
  @Get('/:shopId')
  getPublicShop(@Param('shopId') shopId: string): Promise<ShopForPublicFullResponseDto> {
    return this.shopForPublicService.getPublicShop(shopId);
  }

  @ApiOperation({summary: 'Возвращает полную публичную информацию о товаре по его shopProductId'})
  @ApiShopIdParam()
  @ApiShopProductIdParam()
  @ApiOkResponse({type: ShopProductForPublicResponseDto})
  // ====================================================
  @Get('/:shopId/shop-products/:shopProductId')
  getPublicShopProduct(
    @Param('shopId') shopId: string, 
    @Param('shopProductId') shopProductId: string
  ): Promise<ShopProductForPublicResponseDto> {
    return this.shopForPublicService.getPublicShopProduct(shopId, shopProductId);
  }


}
