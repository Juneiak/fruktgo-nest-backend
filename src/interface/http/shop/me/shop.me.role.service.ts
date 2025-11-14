import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AuthenticatedUser } from 'src/common/types';
import { ShopPreviewResponseDto } from './shop.me.response.dtos';
import { checkId } from 'src/common/utils';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
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
    try {
      checkId([authedShop.id]);

      const query = new ShopQueries.GetShopQuery({ shopId: authedShop.id });
      const shop = await this.shopPort.getShop(query);
      
      if (!shop) throw new NotFoundException('Магазин не найден');

      return plainToInstance(ShopPreviewResponseDto, shop, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID магазина'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}