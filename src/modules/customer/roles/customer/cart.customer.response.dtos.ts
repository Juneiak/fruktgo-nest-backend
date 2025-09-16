import { Expose, Type } from 'class-transformer';
import { ShopPreviewResponseDto } from 'src/modules/shop/shop/roles/public/shop.public.response.dtos';
import { ShopProductResponseDto } from 'src/modules/shop/shop-product/public/shop-product.public.response.dto';

export class CartShopProductDto {
  @Expose() @Type(() => ShopProductResponseDto) shopProduct: ShopProductResponseDto;
  @Expose() selectedQuantity: number;
}


export class CartDeliveryInfoDto {
  @Expose() to: string;
  @Expose() from: string;
  @Expose() estimatedDeliveryDate: Date | null;
  @Expose() actualDeliveryDate: Date | null;
  @Expose() price: number;
}


export class CartResponseDto {
  @Expose() @Type(() => CartShopProductDto) products: CartShopProductDto[];
  @Expose() @Type(() => ShopPreviewResponseDto) selectedShop: ShopPreviewResponseDto | null;
  @Expose() totalSum: number;
  @Expose() isReadyToOrder: boolean;
  @Expose() @Type(() => CartDeliveryInfoDto) deliveryInfo?: CartDeliveryInfoDto | null;
}


export class UpdatedCartResponseDto {
  @Expose() isReadyToOrder: boolean;
}