import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ShopStatus } from 'src/modules/shop/shop.schema';
import { ShopProductStatus } from 'src/modules/shop-product/shop-product.schema';
import { ProductMeasuringScale } from 'src/modules/product/product.schema';
import { Types } from 'mongoose';
import { ProductCategory, ProductStepRate } from 'src/modules/product/product.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class ShopAddressDto {
  @Expose() city: string;
  @Expose() street: string;
  @Expose() house: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
}
export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: string | null;
  @Expose() aboutShop?: string | null;
  @Expose() @Type(() => ShopAddressDto) address?: ShopAddressDto | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() avgRating: number;
  @Expose() ratingsCount: number;
  @Expose() totalOrders: number;
  @Expose() minOrderSum: number;
  @Expose() shopOrdersCount: number;
}
class ProductPreviewDto {
  @Expose() productId: string;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductMeasuringScale;
  @Expose() stepRate: ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() origin?: string;
}
class ShopProductImageDto {
  @ExposeObjectId() imageId: string;
  @Expose() createdAt: Date;
}
export class ShopProductesponseDto {
  @Expose() shopProductId: string;
  @ExposeObjectId() pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}
export class ShopFullResponseDto {
  @Expose() @Type(() => ShopProductesponseDto) shopProducts: ShopProductesponseDto[];
  @Expose() shopId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: string | null;
  @Expose() aboutShop?: string | null;
  @Expose() @Type(() => ShopAddressDto) address?: ShopAddressDto | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() avgRating: number;
  @Expose() ratingsCount: number;
  @Expose() totalOrders: number;
  @Expose() minOrderSum: number;
  @Expose() shopOrdersCount: number;
  @Expose() shopProductsCount: number;
}
