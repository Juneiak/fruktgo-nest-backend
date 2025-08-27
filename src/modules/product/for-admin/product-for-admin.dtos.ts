
import { Expose, Type } from 'class-transformer';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";
import {ShopProductStatus} from 'src/modules/shop/schemas/shop-product.schema'
import { Types } from 'mongoose';
import {LogDto} from 'src/common/modules/logs/logs.dtos'

export class ProductForAdminPreviewResponseDto {
  @Expose()
  productId: string;

  @Expose()
  createdAt: Date;
  
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

  // @Expose()
  // aboutProduct?: string;

  @Expose()
  totalLast7daysSales: number;

  @Expose()
  totalLast7daysWriteOff: number;

  // @Expose()
  // origin?: string;

  @Expose()
  totalStockQuantity: number;

  // @Expose()
  // owner: any;
}

class ShopDto {
  @Expose()
  @Type(() => String)
  shopId: string;

  @Expose()
  @Type(() => String)
  shopImage: string;

  @Expose()
  shopName: string;
}


export class ShopProductResponseDto {
  @Expose()
  shopProductId: string;

  @Expose()
  @Type(() => ShopDto)
  pinnedTo: ShopDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;

  @Expose()
  last7daysSales: number;

  @Expose()
  last7daysWriteOff: number;
}


export class ProductForAdminFullResponseDto {
  @Expose()
  productId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

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
  totalLast7daysSales: number;

  @Expose()
  totalLast7daysWriteOff: number;

  @Expose()
  origin?: string;

  @Expose()
  totalStockQuantity: number;

  @Expose()
  owner: any;

  @Expose()
  @Type(() => ShopProductResponseDto)
  shopProducts: ShopProductResponseDto;
}
