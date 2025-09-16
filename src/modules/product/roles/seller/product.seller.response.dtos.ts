import { Expose, Type } from 'class-transformer';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";
import {ShopProductStatus} from 'src/modules/shop/shop-product/shop-product.schema'
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ProductPreviewResponseDto {
  @Expose() productId: string;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductMeasuringScale;
  @Expose() stepRate: ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() totalLast7daysSales: number;
  @Expose() totalLast7daysWriteOff: number;
  @Expose() origin?: string;
  @Expose() totalStockQuantity: number;
  @Expose() owner: any;
}


class ShopDto {
  @Expose()@Type(() => String) shopId: string;
  @ExposeObjectId() shopImage: string;
  @Expose() shopName: string;
}
export class ShopProductResponseDto {
  @Expose() shopProductId: string;
  @Expose() @Type(() => ShopDto) pinnedTo: ShopDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
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
  @Expose() category: ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductMeasuringScale;
  @Expose() stepRate: ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() totalLast7daysSales: number;
  @Expose() totalLast7daysWriteOff: number;
  @Expose() origin?: string;
  @Expose() totalStockQuantity: number;
  @Expose() owner: any;
  @Expose() @Type(() => ShopProductResponseDto) shopProducts: ShopProductResponseDto;
}


class OfShopProduct {
  @Expose() shopProductId: string;
  @ExposeObjectId() pinnedTo: string;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
}
export class ProductOfShopResponseDto {
  @Expose() productId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @ExposeObjectId() cardImage: Types.ObjectId;
  @Expose() productArticle?: string | null;
  @Expose() productName: string;
  @Expose() category: ProductCategory;
  @Expose() price: number;
  @Expose() measuringScale: ProductMeasuringScale;
  @Expose() stepRate: ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() totalLast7daysSales: number;
  @Expose() totalLast7daysWriteOff: number;
  @Expose() origin?: string;
  @Expose() totalStockQuantity: number;
  @Expose() owner: any;
  @Expose() @Type(() => OfShopProduct) shopProducts: OfShopProduct[];
}