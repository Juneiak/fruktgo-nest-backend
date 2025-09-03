import { Controller, Get, Param } from '@nestjs/common';
import { ShopProductPublicService } from './shop-product.public.service';
import { ShopProductResponseDto } from './shop-product.public.response.dto'; 
import { ApiTags, ApiOperation} from '@nestjs/swagger';

@ApiTags('for public')
@Controller('public/shop-prducts')
export class ShopProductPublicController {
  constructor(private readonly shopProductPublicService: ShopProductPublicService) {}

  // TODO: add getPublicShopProducts

  @ApiOperation({summary: 'Возвращает полную публичную информацию о товаре по его shopProductId'})
  @Get('/:shopId/shop-products/:shopProductId')
  getPublicShopProduct(
    @Param('shopId') shopId: string, 
    @Param('shopProductId') shopProductId: string
  ): Promise<ShopProductResponseDto> {
    return this.shopProductPublicService.getPublicShopProduct(shopId, shopProductId);
  }


}
