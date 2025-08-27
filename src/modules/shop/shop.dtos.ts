import { Exclude, Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LogDto } from 'src/common/modules/logs/logs.dtos';
import {ShopStatus} from 'src/modules/shop/schemas/shop.schema'
import {ShopProductStatus} from 'src/modules/shop/schemas/shop-product.schema'
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";
import { Types } from 'mongoose';

// ====================================================
// SHOP 
// ====================================================


export class ShopFullResponseDto1 {
  @Expose()
  shopId: string;

  @Expose()
  @Type(() => String)
  owner: any;

  @Expose()
  phone: string | null;
  

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  shopName: string;

  @Expose()
  @Type(() => String)
  shopImage?: string | null;

  @Expose()
  aboutShop?: string | null;

  @Expose()
  address?: {
    address: string;
    latitude: number;
    longitude: number;
  } | null;

  @Expose()
  status: ShopStatus;

  @Expose()
  openAt?: string | null;

  @Expose()
  closeAt?: string | null;

  @Expose()
  avgRating: number;

  @Expose()
  totalSales: number;

  @Expose()
  ratingsCount: number;

  @Expose()
  totalOrders: number;

  @Expose()
  minOrderSum: number;

  @Expose()
  lastShiftDate?: Date | null;

  @Expose()
  shopOrdersCount: number;

  @Expose()
  shopProductsCount: number;

  @Expose()
  pinnedEmployeesCount: number;

  @Expose()
  pinnedEmployees: any[];

  @Expose()
  shopProducts: any[];

  @Expose()
  shopOrders: any[];

  @Expose()
  shopShifts: any[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  currentShift: any | null;

  @Expose()
  activeOrders: any[];
}



// ====================================================
// SHIFT 
// ====================================================

export class OpenedByDto {
  @Expose()
  @Type(() => String)
  employee: Types.ObjectId;

  @Expose()
  employeeName: string;
}

export class ClosedByDto {
  @Expose()
  @Type(() => String)
  employee: Types.ObjectId;

  @Expose()
  employeeName: string;
}

export class ShiftStatisticsDto {
  @Expose()
  ordersCount: number;
  
  @Expose()
  declinedOrdersCount: number;
  
  @Expose()
  declinedIncome: number;
  
  @Expose()
  totalIncome: number;
  
  @Expose()
  avgOrderPrice: number;
  
  @Expose()
  avgOrderAssemblyDuration: number;
  
  @Expose()
  avgOrderAcceptanceDuration: number;
  
  @Expose()
  topSellingProducts: string[];
}

export class ShiftFullResponseDto {
  @Expose()
  shiftId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  shop: string | any;
  
  @Expose()
  openedAt: Date;

  @Expose()
  openComment: string | null;

  @Expose()
  closedAt: Date | null;

  @Expose()
  closeComment: string | null;

  @Expose()
  openedBy: OpenedByDto;

  @Expose()
  closedBy: ClosedByDto;
  
  @Expose()
  statistics: ShiftStatisticsDto;

  @Expose()
  @Type(() => LogDto)
  logs: LogDto[];
}



// ====================================================
// SHOP PRODUCTS
// ====================================================
export class ProductPreviewDto {
  @Expose()
  productId: string;

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
  origin?: string;
}

export class ShopProductImageDto {
  @Expose()
  @Type(() => String)
  imageId: string;

  @Expose()
  createdAt: Date;
}

export class ShopProductFullResponseDto {
  @Expose()
  shopProductId: string;
  
  @Expose()
  createdAt: Date;
  
  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => String)
  pinnedTo: string;

  @Expose()
  @Type(() => ProductPreviewDto)
  product: ProductPreviewDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;

  @Expose()
  last7daysSales: number;

  @Expose()
  last7daysWriteOff: number;
  
  @Expose()
  @Type(() => ShopProductImageDto)
  images: ShopProductImageDto[];

  @Expose()
  @Type(() => LogDto)
  logs: LogDto[];
}

export class UpdateShopProductDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsNumber()
  newStockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  newStatus?: ShopProductStatus;
};