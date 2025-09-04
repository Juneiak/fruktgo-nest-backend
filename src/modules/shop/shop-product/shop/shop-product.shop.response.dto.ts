import { Expose, Type } from 'class-transformer';
import { ShopProductStatus } from "src/modules/shop/shop-product/shop-product.schema";
import { Types } from 'mongoose';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";


class ProductDto {
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
  @Expose() owner: any;
};

class ShopProductImageDto {
  @Expose() @Type(() => String) imageId: string;
  @Expose() createdAt: Date;
}

export class ShopProductPreviewResponseDto {
  @Expose() shopProductId: string;
  @Expose() @Type(() => String) pinnedTo: string;
  @Expose() @Type(() => ProductDto) product: ProductDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
}

export class ShopProductFullResponseDto {
  @Expose() shopProductId: string;
  @Expose() @Type(() => String) pinnedTo: string;
  @Expose() @Type(() => ProductDto) product: ProductDto;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() @Type(() => ShopProductImageDto) images: ShopProductImageDto[];
}


export class CurrentShopProductStockResponseDto {
  @Expose() shopProductId: string;
  @Expose() stockQuantity: number;
}