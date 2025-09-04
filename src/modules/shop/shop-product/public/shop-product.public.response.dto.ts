import { Expose, Type } from 'class-transformer';
import { ShopProductStatus } from 'src/modules/shop/shop-product/shop-product.schema';
import { ProductMeasuringScale } from 'src/modules/product/product.schema';
import { Types } from 'mongoose';
import { ProductCategory, ProductStepRate } from 'src/modules/product/product.schema';


class ProductPreviewDto {
  @Expose() productId: string;
  @Expose() @Type(() => String) cardImage: Types.ObjectId;
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
  @Expose() @Type(() => String) imageId: string;
  @Expose() createdAt: Date;
}
export class ShopProductResponseDto {
  @Expose() shopProductId: string;
  @Expose() @Type(() => String) pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}
