import { Expose, Type } from 'class-transformer';
import { ShopPreviewResponseDto } from 'src/modules/shop/shop/roles/public/shop.public.response.dtos';
import { ShopProductResponseDto } from 'src/modules/shop/shop-product/public/shop-product.public.response.dto';

/**
 * Товар в корзине с количеством
 */
export class CartProductDto {
  @Expose() @Type(() => ShopProductResponseDto) shopProduct: ShopProductResponseDto;
  @Expose() selectedQuantity: number;
}

/**
 * Информация о доставке в корзине
 */
export class CartDeliveryInfoDto {
  @Expose() addressId: string | null;
  @Expose() price: number;
  @Expose() estimatedTime: number | null; // минуты
}

/**
 * Полная информация о корзине клиента
 */
export class CartResponseDto {
  @Expose() cartId: string;
  @Expose() @Type(() => CartProductDto) products: CartProductDto[];
  @Expose() @Type(() => ShopPreviewResponseDto) selectedShop: ShopPreviewResponseDto | null;
  @Expose() totalSum: number;
  @Expose() isReadyToOrder: boolean;
  @Expose() @Type(() => CartDeliveryInfoDto) deliveryInfo: CartDeliveryInfoDto | null;
}

/**
 * Ответ после обновления корзины (минимальный)
 */
export class UpdatedCartResponseDto {
  @Expose() isReadyToOrder: boolean;
  @Expose() totalSum: number;
}