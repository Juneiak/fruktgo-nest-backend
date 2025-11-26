/**
 * Admin ShopProduct Response DTOs
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
export class ProductPreviewDto extends PickType(BaseProductResponseDto, [
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
 * Preview — для списков
 */
class _ShopProductPreviewBase extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'pinnedTo',
  'stockQuantity',
  'status',
  'last7daysSales',
  'last7daysWriteOff',
  'createdAt',
  'updatedAt',
] as const) {}

export class ShopProductPreviewResponseDto extends _ShopProductPreviewBase {
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
}

/**
 * Full — с images
 */
export class ShopProductFullResponseDto extends _ShopProductPreviewBase {
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}
