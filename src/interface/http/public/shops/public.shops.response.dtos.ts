/**
 * Public Shop Response DTOs
 *
 * Используем PickType от BaseShopResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/shop.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  BaseShopResponseDto,
  BaseShopStatisticsDto,
} from 'src/interface/http/shared/base-responses';

/**
 * Public statistics — только публичные поля
 */
class PublicShopStatisticsDto extends PickType(BaseShopStatisticsDto, [
  'avgRating',
  'ratingsCount',
  'ordersCount',
] as const) {}

/**
 * Preview — для списков (публичные данные)
 */
class _ShopPreviewBase extends PickType(BaseShopResponseDto, [
  'shopId',
  'blocked',
  'verifiedStatus',
  'shopName',
  'shopImage',
  'aboutShop',
  'address',
  'status',
  'openAt',
  'closeAt',
  'minOrderSum',
] as const) {}

export class ShopPreviewResponseDto extends _ShopPreviewBase {
  @Expose() @Type(() => PublicShopStatisticsDto) statistics: PublicShopStatisticsDto;
}

/**
 * Full — публичный полный вид
 */
class _ShopFullBase extends PickType(BaseShopResponseDto, [
  'shopId',
  'blocked',
  'verifiedStatus',
  'shopName',
  'shopImage',
  'aboutShop',
  'address',
  'status',
  'openAt',
  'closeAt',
  'minOrderSum',
] as const) {}

export class ShopFullResponseDto extends _ShopFullBase {
  @Expose() @Type(() => PublicShopStatisticsDto) statistics: PublicShopStatisticsDto;
}
