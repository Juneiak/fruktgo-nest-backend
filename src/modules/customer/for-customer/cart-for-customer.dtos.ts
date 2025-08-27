import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ShopForPublicPreviewResponseDto, ShopProductForPublicResponseDto } from 'src/modules/shop/for-public/shops-for-public.dtos';
import { testSwaggerIds } from 'src/common/swagger';

export class CartShopProductDto {
  @Expose()
  @Type(() => ShopProductForPublicResponseDto)
  shopProduct: ShopProductForPublicResponseDto;

  @Expose()
  selectedQuantity: number;
}

export class CartResponseDto {
  @Expose()
  @Type(() => CartShopProductDto)
  products: CartShopProductDto[];

  @Expose()
  @Type(() => ShopForPublicPreviewResponseDto)
  selectedShop: ShopForPublicPreviewResponseDto | null;

  @Expose()
  totalSum: number;

  @Expose()
  isReadyToOrder: boolean;

  @Expose()
  deliveryInfo?: {
    to: string;
    from: string;
    estimatedDeliveryDate: Date | null;
    actualDeliveryDate: Date | null;
    price: number;
  };
}


export class SelectShopForCartDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;
}


export class UpdateProductInCartDto {
  @IsString()
  @IsNotEmpty()
  shopProductId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}

export class RemoveProductInCartDto {
  @IsString()
  @IsNotEmpty()
  shopProductId: string;
}

export class UpdatedCartResponseDto {
  @Expose()
  isReadyToOrder: boolean;
}