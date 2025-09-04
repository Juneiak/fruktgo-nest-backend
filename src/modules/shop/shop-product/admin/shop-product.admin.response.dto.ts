import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from 'src/modules/product/product.schema';
import { ShopProductStatus } from 'src/modules/shop/shop-product/shop-product.schema';

export class ProductPreviewDto {
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

export class ShopProductFullResponseDto {
  @Expose() shopProductId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() @Type(() => String) pinnedTo: string;
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
  @Expose() @Type(() => String) pinnedTo: string;
  @Expose() @Type(() => ProductPreviewDto) product: ProductPreviewDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
}
