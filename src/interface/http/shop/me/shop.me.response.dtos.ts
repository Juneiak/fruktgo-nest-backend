/**
 * Shop Me Response DTOs
 *
 * Магазин видит свой профиль (без sellerNote, internalNote).
 * @see src/interface/http/shared/base-responses/shop.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import {
  BaseShopResponseDto,
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
 * Preview — профиль магазина (для employee)
 */
class _ShopPreviewBase extends PickType(BaseShopResponseDto, [
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
  'acceptanceTimeLimit',
  'assemblyTimeLimit',
  'minWeightDifferencePercentage',
] as const) {}

export class ShopPreviewResponseDto extends _ShopPreviewBase {
  @Expose() @Type(() => CurrentShiftDto) currentShift?: CurrentShiftDto | null;
  @ExposeObjectId() pinnedEmployees: string[];
}
