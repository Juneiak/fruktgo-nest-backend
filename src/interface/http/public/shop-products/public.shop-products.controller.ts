import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicShopProductsRoleService } from './public.shop-products.role.service';
import { ShopProductResponseDto } from './public.shop-products.response.dtos'; 
import { ApiTags, ApiOperation} from '@nestjs/swagger';
import { ShopProductQueryDto } from './public.shop-products.query.dtos';
import { PaginatedResponseDto, } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';

@ApiTags('for public')
@Controller()
export class PublicShopProductsController {
  constructor(private readonly publicShopProductsRoleService: PublicShopProductsRoleService) {}

  // TODO: add getPublicShopProducts
  @ApiOperation({summary: 'Возвращает превью продуктов магазина с пагинацией'})
  getPublicShopProducts(
    @Query() shopProductQuery: ShopProductQueryDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    return this.publicShopProductsRoleService.getPublicShopProducts(shopProductQuery, paginationQuery);
  }


  @ApiOperation({summary: 'Возвращает полную публичную информацию о товаре по его shopProductId'})
  @Get(':shopProductId')
  getPublicShopProduct( 
    @Param('shopProductId') shopProductId: string
  ): Promise<ShopProductResponseDto> {
    return this.publicShopProductsRoleService.getPublicShopProduct(shopProductId);
  }

}
