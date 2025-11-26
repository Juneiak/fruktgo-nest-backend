/**
 * Admin Seller Response DTOs
 *
 * Используем PickType от BaseSellerResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/seller.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BaseSellerResponseDto, BaseSellerStatisticsDto } from 'src/interface/http/shared/base-responses';

/**
 * Preview — для списков (со статистикой)
 */
class _SellerPreviewBase extends PickType(BaseSellerResponseDto, [
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
  'internalNote',
  'createdAt',
  'updatedAt',
] as const) {}

export class SellerPreviewResponseDto extends _SellerPreviewBase {
  @Expose() @Type(() => BaseSellerStatisticsDto) statistics: BaseSellerStatisticsDto;
}

/**
 * Full — все поля + shops
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
  'internalNote',
  'shops',
  'createdAt',
  'updatedAt',
] as const) {}

export class SellerFullResponseDto extends _SellerFullBase {
  @Expose() @Type(() => BaseSellerStatisticsDto) statistics: BaseSellerStatisticsDto;
}