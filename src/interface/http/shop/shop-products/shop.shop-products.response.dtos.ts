/**
 * Shop ShopProduct Response DTOs
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
 * Product — вложенный в ShopProduct (populated)
 */
class ProductDto extends PickType(BaseProductResponseDto, [
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
  'owner',
] as const) {}

/**
 * Image DTO
 */
class ShopProductImageDto {
  @ExposeObjectId() imageId: string;
  @Expose() createdAt: Date;
}

/**
 * Shop view — базовые поля
 */
class _ShopProductBase extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'pinnedTo',
  'stockQuantity',
  'status',
] as const) {}

export class ShopProductResponseDto extends _ShopProductBase {
  @Expose() @Type(() => ProductDto) product: ProductDto;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}

/**
 * Current stock — минимальный DTO
 */
export class CurrentShopProductStockResponseDto extends PickType(BaseShopProductResponseDto, [
  'shopProductId',
  'stockQuantity',
] as const) {}