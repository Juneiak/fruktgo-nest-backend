import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from 'src/modules/shop/shop/shop.schema';
import { ShopProductStatus } from 'src/modules/shop-product/shop-product.schema';
import { ProductMeasuringScale } from 'src/modules/product/product.schema';
import { Types } from 'mongoose';
import { ProductCategory, ProductStepRate } from 'src/modules/product/product.schema';

class ShopAddressDto {
  @Expose()
  city: string;

  @Expose()
  street: string;

  @Expose()
  house: string;

  @Expose()
  latitude: number;

  @Expose()
  longitude: number;
}

export class ShopForPublicPreviewResponseDto {
  @Expose()
  shopId: string;
  
  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  shopName: string;

  @Expose()
  @Type(() => String)
  shopImage?: string | null;

  @Expose()
  aboutShop?: string | null;

  @Expose()
  @Type(() => ShopAddressDto)
  address?: ShopAddressDto | null;

  @Expose()
  status: ShopStatus;

  @Expose()
  openAt?: string | null;

  @Expose()
  closeAt?: string | null;

  @Expose()
  avgRating: number;

  @Expose()
  ratingsCount: number;

  @Expose()
  totalOrders: number;

  @Expose()
  minOrderSum: number;

  @Expose()
  shopOrdersCount: number;
}


class ProductPreviewDto {
  @Expose()
  productId: string;

  @Expose()
  @Type(() => String)
  cardImage: Types.ObjectId;

  @Expose()
  productArticle?: string | null;

  @Expose()
  productName: string;

  @Expose()
  category: ProductCategory;

  @Expose()
  price: number;

  @Expose()
  measuringScale: ProductMeasuringScale;

  @Expose()
  stepRate: ProductStepRate;

  @Expose()
  aboutProduct?: string;
  
  @Expose()
  origin?: string;
}
class ShopProductImageDto {
  @Expose()
  @Type(() => String)
  imageId: string;

  @Expose()
  createdAt: Date;
}
export class ShopProductForPublicResponseDto {
  @Expose()
  shopProductId: string;
  
  @Expose()
  @Type(() => String)
  pinnedTo: string;

  @Expose()
  @Type(() => ProductPreviewDto)
  product: ProductPreviewDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;
  
  @Expose()
  @Type(() => ShopProductImageDto)
  images: ShopProductImageDto[];
}

export class ShopForPublicFullResponseDto {
  @Expose()
  @Type(() => ShopProductForPublicResponseDto)
  shopProducts: ShopProductForPublicResponseDto[];

  @Expose()
  shopId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  shopName: string;

  @Expose()
  @Type(() => String)
  shopImage?: string | null;

  @Expose()
  aboutShop?: string | null;

  @Expose()
  @Type(() => ShopAddressDto)
  address?: ShopAddressDto | null;

  @Expose()
  status: ShopStatus;

  @Expose()
  openAt?: string | null;

  @Expose()
  closeAt?: string | null;

  @Expose()
  avgRating: number;

  @Expose()
  ratingsCount: number;

  @Expose()
  totalOrders: number;

  @Expose()
  minOrderSum: number;

  @Expose()
  shopOrdersCount: number;

  @Expose()
  shopProductsCount: number;
}
