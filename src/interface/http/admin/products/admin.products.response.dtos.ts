import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { ProductEnums } from 'src/modules/product';
import { ShopProductEnums } from 'src/modules/shop-product';

export class ProductPreviewResponseDto {
  @Expose() productId: string;
  @Expose() createdAt: Date;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductEnums.ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductEnums.ProductMeasuringScale;
  @Expose() stepRate: ProductEnums.ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() totalLast7daysSales: number;
  @Expose() totalLast7daysWriteOff: number;
  @Expose() origin?: string;
  @Expose() totalStockQuantity: number;
  @ExposeObjectId() owner: Types.ObjectId;
}


class ShopDto {
  @ExposeObjectId() shopId: string;
  @ExposeObjectId() shopImage: Types.ObjectId;
  @Expose() shopName: string;
}
class ShopProductDto {
  @Expose() shopProductId: string;
  @Expose() @Type(() => ShopDto) pinnedTo: ShopDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductEnums.ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
}
export class ProductFullResponseDto {
  @Expose() productId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductEnums.ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductEnums.ProductMeasuringScale;
  @Expose() stepRate: ProductEnums.ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() totalLast7daysSales: number;
  @Expose() totalLast7daysWriteOff: number;
  @Expose() origin?: string;
  @Expose() totalStockQuantity: number;
  @ExposeObjectId() owner: Types.ObjectId;
  @Expose() @Type(() => ShopProductDto) shopProducts: ShopProductDto;
}
