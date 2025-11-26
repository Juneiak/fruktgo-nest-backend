/**
 * Seller Me Response DTOs
 *
 * Продавец видит свой профиль (без internalNote).
 * @see src/interface/http/shared/base-responses/seller.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BaseSellerResponseDto, BaseSellerStatisticsDto } from 'src/interface/http/shared/base-responses';

/**
 * Preview — краткая информация
 */
export class SellerPreviewResponseDto extends PickType(BaseSellerResponseDto, [
  'sellerId',
  'sellerLogo',
  'companyName',
  'blocked',
  'verifiedStatus',
  'phone',
  'telegramId',
] as const) {}

/**
 * Full — полный профиль (без internalNote)
 */
class _SellerFullBase extends PickType(BaseSellerResponseDto, [
  'sellerId',
  'sellerLogo',
  'companyName',
  'inn',
  'blocked',
  'verifiedStatus',
  'phone',
  'email',
  'telegramId',
  'telegramUsername',
  'telegramFirstName',
  'telegramLastName',
  'lastLoginAt',
  'createdAt',
] as const) {}

export class SellerFullResponseDto extends _SellerFullBase {
  @Expose() @Type(() => BaseSellerStatisticsDto) statistics: BaseSellerStatisticsDto;
}
