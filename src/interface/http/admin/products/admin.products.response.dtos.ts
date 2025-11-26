/**
 * Admin Product Response DTOs
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
 * Preview — для списков (со статистикой)
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
  'owner',
  'createdAt',
] as const) {}

export class ProductPreviewResponseDto extends _ProductPreviewBase {
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
}

/**
 * Full — с shopProducts (populated)
 */
class ShopDto extends PickType(BaseShopResponseDto, [
  'shopId',
  'shopImage',
  'shopName',
] as const) {}

class ShopProductDto extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'stockQuantity',
  'status',
  'last7daysSales',
  'last7daysWriteOff',
] as const) {
  @Expose() @Type(() => ShopDto) pinnedTo: ShopDto;
}

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
  'owner',
  'createdAt',
  'updatedAt',
] as const) {}

export class ProductFullResponseDto extends _ProductFullBase {
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
  @Expose() @Type(() => ShopProductDto) shopProducts: ShopProductDto[];
}
