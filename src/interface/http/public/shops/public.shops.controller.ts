import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicShopsRoleService } from './public.shops.role.service';
import { 
  ShopFullResponseDto,
  ShopPreviewResponseDto,
} from './public.shops.response.dtos'; 
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';

@ApiTags('for public')
@Controller()
export class PublicShopsController {
  constructor(
    private readonly publicShopsRoleService: PublicShopsRoleService
  ) {}


  @ApiOperation({summary: 'Возвращает список превью информации о всех публичных магазинах'})
  @Get()
  getPublicShops(
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    return this.publicShopsRoleService.getPublicShops(paginationQuery);
  }


  @ApiOperation({summary: 'Возвращает полную публичную информацию о магазине по его shopId'})
  @Get(':shopId')
  getPublicShop(
    @Param('shopId') shopId: string
  ): Promise<ShopFullResponseDto> {
    return this.publicShopsRoleService.getPublicShop(shopId);
  }
}
