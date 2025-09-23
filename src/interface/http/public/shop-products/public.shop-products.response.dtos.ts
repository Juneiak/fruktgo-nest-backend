import { Expose, Type } from 'class-transformer';
import { ShopProductStatus } from 'src/modules/shop-product/shop-product.schema';
import { ProductMeasuringScale } from 'src/modules/product/product.schema';
import { Types } from 'mongoose';
import { ProductCategory, ProductStepRate } from 'src/modules/product/product.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

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
export class ShopProductResponseDto {
  @Expose() shopProductId: string;
  @ExposeObjectId() pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}
