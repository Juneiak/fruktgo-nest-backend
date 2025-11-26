/**
 * Seller Product Response DTOs
 *
 * Используем PickType от BaseProductResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/product.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  BaseProductResponseDto,
  BaseProductStatisticsDto,
  BaseShopResponseDto,
  BaseShopProductResponseDto,
} from 'src/interface/http/shared/base-responses';

/**
 * Preview — для списков (без owner, со статистикой)
 */
class _ProductPreviewBase extends PickType(BaseProductResponseDto, [
  'productId',
  'cardImage',
  'productArticle',
  'productName',
  'category',
  'price',
  'measuringScale',
  'stepRate',
  'aboutProduct',
  'origin',
  'totalStockQuantity',
] as const) {}

export class ProductPreviewResponseDto extends _ProductPreviewBase {
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
}

/**
 * ShopProduct DTO (populated pinnedTo)
 */
class ShopDto extends PickType(BaseShopResponseDto, [
  'shopId',
  'shopImage',
  'shopName',
] as const) {}

class _ShopProductBase extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'stockQuantity',
  'status',
  'last7daysSales',
  'last7daysWriteOff',
] as const) {}

export class ShopProductResponseDto extends _ShopProductBase {
  @Expose() @Type(() => ShopDto) pinnedTo: ShopDto;
}

/**
 * Full — с shopProducts (populated)
 */
class _ProductFullBase extends PickType(BaseProductResponseDto, [
  'productId',
  'cardImage',
  'productArticle',
  'productName',
  'category',
  'price',
  'measuringScale',
  'stepRate',
  'aboutProduct',
  'origin',
  'totalStockQuantity',
  'createdAt',
  'updatedAt',
] as const) {}

export class ProductFullResponseDto extends _ProductFullBase {
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
  @Expose() @Type(() => ShopProductResponseDto) shopProducts: ShopProductResponseDto[];
}

/**
 * ProductOfShop — для списка товаров магазина (pinnedTo как ObjectId)
 */
class OfShopProduct extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'pinnedTo',
  'stockQuantity',
  'status',
  'last7daysSales',
  'last7daysWriteOff',
] as const) {}

export class ProductOfShopResponseDto extends _ProductFullBase {
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
  @Expose() @Type(() => OfShopProduct) shopProducts: OfShopProduct[];
}