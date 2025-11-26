import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto, 
  ShopFullResponseDto,
} from './public.shops.response.dtos';
import { checkId } from 'src/common/utils';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries
} from 'src/modules/shop';

import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/shared';

@Injectable()
export class PublicShopsRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
  ) {}


  async getPublicShops(
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    try {
      const query = new ShopQueries.GetShopsQuery();
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };

      const result = await this.shopPort.getShops(query, queryOptions);
      return transformPaginatedResult(result, ShopPreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getPublicShop(shopId: string): Promise<ShopFullResponseDto> {
    try {
      const query = new ShopQueries.GetShopQuery({ shopId });
      const shop = await this.shopPort.getShop(query);
      
      if (!shop) throw new NotFoundException('Магазин не найден');

      // TODO: Добавить verifyUserStatus если нужно проверять статус для публичного API
      // verifyUserStatus(shop);

      return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true });
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