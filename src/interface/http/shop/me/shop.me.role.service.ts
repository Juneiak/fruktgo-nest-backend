import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { ShopPreviewResponseDto } from './shop.me.response.dtos';
import { checkId } from 'src/common/utils';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries
} from 'src/modules/shop';

@Injectable()
export class ShopMeRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort
  ) {}

  async getShopPreviewInfo(
    authedShop: AuthenticatedUser
  ): Promise<ShopPreviewResponseDto> {
    checkId([authedShop.id]);

    const query = new ShopQueries.GetShopQuery({ shopId: authedShop.id });
    const shop = await this.shopPort.getShop(query);
    
    if (!shop) throw new NotFoundException('Магазин не найден');

    return plainToInstance(ShopPreviewResponseDto, shop, { excludeExtraneousValues: true });
  }
}