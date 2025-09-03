import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsDate, IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from "src/modules/shop/schemas/shop.schema";
import { ShopProductStatus } from "src/modules/shop/schemas/shop-product.schema";
import { Types } from 'mongoose';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";

// ====================================================
// SHOP
// ====================================================
class OpenedByDto {
  @Expose()
  @Type(() => String)
  employee: Types.ObjectId;

  @Expose()
  employeeName: string;
}

class ClosedByDto {
  @Expose()
  @Type(() => String)
  employee: Types.ObjectId;

  @Expose()
  employeeName: string;
}

class ShiftStatisticsDto {
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

export class ShiftForShopPreviewResponseDto {
  @Expose()
  shiftId: string;

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
  @Type(() => OpenedByDto)
  openedBy: OpenedByDto;

  @Expose()
  @Type(() => ClosedByDto)
  closedBy: ClosedByDto;
  
  @Expose()
  @Type(() => ShiftStatisticsDto)
  statistics: ShiftStatisticsDto;
}

class PinnedEmployeeForShopDto {
  @Expose()
  employeeId: string;

  @Expose()
  employeeName: string;
}

export class ShopForShopPreviewResponseDto{
  @Expose()
  shopId: string;

  @Expose()
  @Type(() => String)
  owner: any;
  
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
  minOrderSum: number;

  @Expose()
  @Type(() => ShiftForShopPreviewResponseDto)
  currentShift: ShiftForShopPreviewResponseDto;

  @Expose()
  @Type(() => PinnedEmployeeForShopDto)
  pinnedEmployees: PinnedEmployeeForShopDto[];
}


// ====================================================
// SHOP PRODUCT
// ====================================================

class ProductDto {
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

  @Expose()
  owner: any;
};

class ShopProductImageDto {
  @Expose()
  @Type(() => String)
  imageId: string;

  @Expose()
  createdAt: Date;
}

export class ShopProductForShopPreviewResponseDto {
 @Expose()
  shopProductId: string;

  @Expose()
  @Type(() => String)
  pinnedTo: string;

  @Expose()
  @Type(() => ProductDto)
  product: ProductDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;
}

export class ShopProductForShopFullResponseDto {
  @Expose()
  shopProductId: string;

  @Expose()
  @Type(() => String)
  pinnedTo: string;

  @Expose()
  @Type(() => ProductDto)
  product: ProductDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;
  
  @Expose()
  @Type(() => ShopProductImageDto)
  images: ShopProductImageDto[];
}



export class RemoveShopProductImageDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateShopProductByEmployeeDto {
  @IsOptional()
  @IsNumber()
  newStockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  newStatus?: ShopProductStatus;

  @IsString()
  @IsOptional()
  comment?: string;
};


export class CurrentShopProductsStockDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  shopProductIds: string[];
}

export class CurrentShopProductStockResponseDto {
  @Expose()
  shopProductId: string;

  @Expose()
  stockQuantity: number;
}


// ====================================================
// SHIFT
// ====================================================
export class OpenShiftByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  openAt: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class CloseShiftByEmployeeDto {
  @IsNotEmpty()
  @IsDate()
  @IsOptional()
  closeAt: Date;

  @IsString()
  @IsOptional()
  comment: string;
}
