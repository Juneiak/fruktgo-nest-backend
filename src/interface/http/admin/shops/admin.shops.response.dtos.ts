/**
 * Admin Shop Response DTOs
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
 * Preview — для списков магазинов
 */
class _ShopPreviewBase extends PickType(BaseShopResponseDto, [
  'shopId',
  'owner',
  'blocked',
  'verifiedStatus',
  'shopName',
  'shopImage',
  'address',
  'status',
  'openAt',
  'closeAt',
  'minOrderSum',
  'currentShift',
  'internalNote',
  'acceptanceTimeLimit',
  'assemblyTimeLimit',
  'minWeightDifferencePercentage',
  'createdAt',
] as const) {}

export class ShopPreviewResponseDto extends _ShopPreviewBase {
  @Expose() @Type(() => BaseShopStatisticsDto) statistics: BaseShopStatisticsDto;
}

/**
 * Full — все поля (admin видит всё)
 */
class _ShopFullBase extends PickType(BaseShopResponseDto, [
  'shopId',
  'owner',
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
  'currentShift',
  'activeOrders',
  'internalNote',
  'acceptanceTimeLimit',
  'assemblyTimeLimit',
  'minWeightDifferencePercentage',
  'createdAt',
  'updatedAt',
] as const) {}

export class ShopFullResponseDto extends _ShopFullBase {
  @Expose() @Type(() => BaseShopStatisticsDto) statistics: BaseShopStatisticsDto;
}
