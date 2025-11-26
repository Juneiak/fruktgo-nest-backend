/**
 * Seller Shop Response DTOs
 *
 * Используем PickType от BaseShopResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/shop.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  BaseShopResponseDto,
  BaseShopStatisticsDto,
  BaseShiftResponseDto,
  BaseShiftStatisticsDto,
} from 'src/interface/http/shared/base-responses';

/**
 * CurrentShift — вложенный DTO для populated shift
 */
class _CurrentShiftBase extends PickType(BaseShiftResponseDto, [
  'shiftId',
  'shop',
  'status',
  'openedBy',
  'openedAt',
  'closedBy',
  'closedAt',
  'createdAt',
  'updatedAt',
] as const) {}

class CurrentShiftDto extends _CurrentShiftBase {
  @Expose() @Type(() => BaseShiftStatisticsDto) statistics: BaseShiftStatisticsDto;
}

/**
 * Preview — для списков (без currentShift, без sellerNote)
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
  'acceptanceTimeLimit',
  'assemblyTimeLimit',
  'minWeightDifferencePercentage',
  'createdAt',
] as const) {}

export class ShopPreviewResponseDto extends _ShopPreviewBase {
  @Expose() @Type(() => BaseShopStatisticsDto) statistics: BaseShopStatisticsDto;
}

/**
 * Full — с currentShift (populated), sellerNote
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
  'sellerNote',
  'acceptanceTimeLimit',
  'assemblyTimeLimit',
  'minWeightDifferencePercentage',
  'createdAt',
] as const) {}

export class ShopFullResponseDto extends _ShopFullBase {
  @Expose() @Type(() => BaseShopStatisticsDto) statistics: BaseShopStatisticsDto;
  @Expose() @Type(() => CurrentShiftDto) currentShift?: CurrentShiftDto | null;
}
