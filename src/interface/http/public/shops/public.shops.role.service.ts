import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto, 
  ShopFullResponseDto,
} from './public.shops.response.dtos';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries
} from 'src/modules/shop';


@Injectable()
export class PublicShopsRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
  ) {}


  async getPublicShops(
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    const query = new ShopQueries.GetShopsQuery();

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shopPort.getShops(query, queryOptions);
    return transformPaginatedResult(result, ShopPreviewResponseDto);
  }


  async getPublicShop(shopId: string): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    const query = new ShopQueries.GetShopQuery({ shopId });
    const shop = await this.shopPort.getShop(query);
    
    if (!shop) throw new NotFoundException('Магазин не найден');

    // TODO: Добавить verifyUserStatus если нужно проверять статус для публичного API
    // verifyUserStatus(shop);

    return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true });
  }
}