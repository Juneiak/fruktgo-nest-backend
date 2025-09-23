import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from 'src/modules/product/product.schema';
import { ShopProductStatus } from 'src/modules/shop-product/shop-product.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ProductPreviewDto {
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

export class ShopProductFullResponseDto {
  @Expose() shopProductId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @ExposeObjectId() pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
};

export class ShopProductPreviewResponseDto {
  @Expose() shopProductId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @ExposeObjectId() pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
}
