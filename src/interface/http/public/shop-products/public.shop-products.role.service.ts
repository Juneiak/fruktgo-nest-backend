import { BadRequestException, Injectable, NotFoundException, Inject, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ShopProductResponseDto } from './public.shop-products.response.dtos';
import { checkId } from 'src/common/utils';
import { ShopProductQueryDto } from './public.shop-products.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
  ShopProductQueries
} from 'src/modules/shop-product';
import { ShopPort, SHOP_PORT, ShopQueries } from 'src/modules/shop';

import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/shared';


@Injectable()
export class PublicShopProductsRoleService {
  constructor(
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
  ) {}

  async getPublicShopProducts(
    shopProductQuery: ShopProductQueryDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
    try {
      const { shopId } = shopProductQuery;
      if (!shopId) throw new BadRequestException('Магазин не указан');

      // Проверяем что магазин существует и доступен
      const shop = await this.shopPort.getShop(new ShopQueries.GetShopQuery({ shopId }));
      if (!shop) throw new NotFoundException('Магазин не найден или недоступен');

      const query = new ShopProductQueries.GetShopProductsQuery({
        shopId,
      }, {
        populateProduct: true,
      });

      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };

      const result = await this.shopProductPort.getShopProducts(query, queryOptions);
      return transformPaginatedResult(result, ShopProductResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Магазин не найден'),
        [DomainErrorCode.BAD_REQUEST]: new BadRequestException('Неверные параметры запроса'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getPublicShopProduct(
    shopProductId: string
  ): Promise<ShopProductResponseDto> {
    try {
      const query = new ShopProductQueries.GetShopProductQuery(shopProductId, {
        populateProduct: true,
        populateImages: true,
      });

      const shopProduct = await this.shopProductPort.getShopProduct(query);
      if (!shopProduct) throw new NotFoundException('Товар не найден');

      return plainToInstance(ShopProductResponseDto, shopProduct, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID товара'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }

  // async getPublicShopProducts(
  //   shopProductQuery: ShopProductQueryDto,
  //   paginationQuery: PaginationQueryDto
  // ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
  //   const { shopId } = shopProductQuery;
  //   if (!shopId) throw new BadRequestException('Магазин не указан');

  //   const okShop = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: new Types.ObjectId(shopId) }
  //   )
  //   if (!okShop) throw new NotFoundException('Магазин не найден или недоступен или заблокирован или не верифицирован');

  //   const { page = 1, pageSize = 10 } = paginationQuery;
  //   const foundShopProducts = await this.shopProductModel.paginate(
  //     { pinnedTo: new Types.ObjectId(shopId) }, 
  //     { page, limit: pageSize, lean: true, leanWithId: false}
  //   )
  //   return transformPaginatedResult(foundShopProducts, ShopProductResponseDto);
  // }

  
  // async getPublicShopProduct(shopProductId: string): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId]);
  //   const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
  //     .populate('product')
  //     .populate('images', 'imageId createdAt')
  //     .lean({ virtuals: true }).exec();
  //   if (!foundShopProduct) throw new NotFoundException('Товар не найден');

  //   const okShop = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: foundShopProduct.pinnedTo }
  //   )
  //   if (!okShop) throw new NotFoundException('Магазин не найден или недоступен или заблокирован или не верифицирован');

  //   return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true});
  // }

}