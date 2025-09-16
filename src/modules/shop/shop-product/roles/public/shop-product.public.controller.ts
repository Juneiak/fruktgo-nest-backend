import { Controller, Get, Param, Query } from '@nestjs/common';
import { ShopProductPublicService } from './shop-product.public.service';
import { ShopProductResponseDto } from './shop-product.public.response.dtos'; 
import { ApiTags, ApiOperation} from '@nestjs/swagger';
import { ShopProductQueryFilterDto } from './shop-product.public.filter.dtos';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';

@ApiTags('for public')
@Controller('public/shop-prducts')
export class ShopProductPublicController {
  constructor(private readonly shopProductPublicService: ShopProductPublicService) {}

  // TODO: add getPublicShopProducts
  @ApiOperation({summary: 'Возвращает превью продуктов магазина с пагинацией'})
  getPublicShopProducts(
    @Query() shopProductQueryFilter: ShopProductQueryFilterDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.shopProductPublicService.getPublicShopProducts(shopProductQueryFilter, paginationQuery);
  }

  @ApiOperation({summary: 'Возвращает полную публичную информацию о товаре по его shopProductId'})
  @Get('/:shopProductId')
  getPublicShopProduct( 
    @Param('shopProductId') shopProductId: string
  ): Promise<ShopProductResponseDto> {
    return this.shopProductPublicService.getPublicShopProduct(shopProductId);
  }


}
