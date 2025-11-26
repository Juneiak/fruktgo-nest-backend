/**
 * Public ShopProduct Response DTOs
 *
 * Используем PickType от BaseShopProductResponseDto и BaseProductResponseDto.
 * @see src/interface/http/shared/base-responses/shop-product.base-response
 */

import { PickType } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import {
  BaseShopProductResponseDto,
  BaseProductResponseDto,
} from 'src/interface/http/shared/base-responses';

/**
 * Product preview — вложенный в ShopProduct (populated)
 */
class ProductPreviewDto extends PickType(BaseProductResponseDto, [
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
] as const) {}

/**
 * Image DTO
 */
class ShopProductImageDto {
  @ExposeObjectId() imageId: string;
  @Expose() createdAt: Date;
}

/**
 * Public view — без last7daysSales, last7daysWriteOff
 */
class _ShopProductBase extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'pinnedTo',
  'stockQuantity',
  'status',
] as const) {}

export class ShopProductResponseDto extends _ShopProductBase {
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}
