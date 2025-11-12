import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { ProductEnums } from 'src/modules/product';
import { ShopProductEnums } from 'src/modules/shop-product';

export class ProductPreviewDto {
  @Expose() productId: string;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductEnums.ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductEnums.ProductMeasuringScale;
  @Expose() stepRate: ProductEnums.ProductStepRate;
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
  @Expose() status: ShopProductEnums.ShopProductStatus;
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
  @Expose() status: ShopProductEnums.ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
}
