import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {  IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { SwaggerSchemaProperties } from 'src/common/swagger/api-form-data.decorator';
import { transformDtoToFormDataNumber } from 'src/common/utils';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from 'src/modules/shop/schemas/shop.schema';
import { LogDto } from 'src/common/modules/logs/logs.dtos';
import { ShopProductStatus } from "src/modules/shop/schemas/shop-product.schema";
import { Types } from 'mongoose';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";



// ====================================================
// SHIFT
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

class StatisticsDto {
  @Expose()
  ordersCount: number;
}


class ShopDto {
  @Expose()
  shopId: string;

  @Expose()
  shopName: string;
}

class ShopAddressDto {
  @Expose()
  city: string;

  @Expose()
  street: string;

  @Expose()
  house: string;

  @Expose()
  latitude: number;

  @Expose()
  longitude: number;
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


export class ShiftForSellerPreviewResponseDto {
  @Expose()
  shiftId: string;

  @Expose()
  openedAt: Date;

  @Expose()
  closedAt: Date | null;

  @Expose()
  openedBy: OpenedByDto;

  @Expose()
  closedBy: ClosedByDto;

  @Expose()
  ordersCount: number;

  @Expose()
  @Type(() => StatisticsDto)
  statistics: StatisticsDto;
}


export class ShiftForSellerTelegramBotPreviewResponseDto {
  @Expose()
  shop: ShopDto;

  @Expose()
  shiftId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
  
  @Expose()
  openedAt: Date;

  @Expose()
  openComment: string | null;

  @Expose()
  openedBy: OpenedByDto;

  @Expose()
  closedBy: ClosedByDto;
  
  @Expose()
  statistics: ShiftStatisticsDto;
}

export class ShiftForSellerFullResponseDto {
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
  openedBy: OpenedByDto;

  @Expose()
  closedBy: ClosedByDto;
  
  @Expose()
  statistics: ShiftStatisticsDto;
}



// ====================================================
// SHOP
// ====================================================
export class ShopForSellerPreviewResponseDto {
  @Expose()
  shopId: string;

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
  @Type(() => ShopAddressDto)
  address?: ShopAddressDto | null;

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
  createdAt: Date;
}

export class ShopForSellerFullResponseDto {
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
  @Type(() => ShopAddressDto)
  address?: ShopAddressDto | null;

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
  sellerNote?: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => ShiftForSellerPreviewResponseDto)
  currentShift?: ShiftForSellerPreviewResponseDto;
}



// UPDATE SHOP
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  aboutShop?: string | null;

  @IsOptional()
  @IsString()
  openAt?: string | null;

  @IsOptional()
  @IsString()
  closeAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Transform(transformDtoToFormDataNumber)
  minOrderSum?: number;
}
export const UpdateShopFormDataDto: SwaggerSchemaProperties = {
  aboutShop: { type: "string", example: "Описание магазина", description: "Описание" },
  openAt: { type: "string", example: "10:00", description: "Открытие" },
  closeAt: { type: "string", example: "20:00", description: "Закрытие" },
  minOrderSum: { type: "number", example: 1000, description: "Минимальная сумма заказа" },
};



// CREATE SHOP
export class CreateShopDto {
  @IsOptional()
  @IsString()
  shopName?: string | null;

  @IsOptional()
  @IsString()
  aboutShop?: string | null;

  @IsOptional()
  @IsString()
  openAt?: string | null;

  @IsOptional()
  @IsString()
  closeAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => typeof value === 'string' ? Number(value) : value)
  minOrderSum?: number;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  street?: string | null;

  @IsOptional()
  @IsString()
  house?: string | null;

  @IsOptional()
  @IsString()
  latitude?: string | null;

  @IsOptional()
  @IsString()
  longitude?: string | null;
}
export const CreateShopFormDataDto: SwaggerSchemaProperties = {
  shopName: {type: "string", example: "Магазин 1", description: "Название магазина" },
  aboutShop: { type: "string", example: "Описание магазина", description: "Описание" },
  openAt: { type: "string", example: "10:00", description: "Открытие" },
  closeAt: { type: "string", example: "20:00", description: "Закрытие" },
  minOrderSum: { type: "number", example: 1000, description: "Минимальная сумма заказа" },
  city: { type: "string", example: "Краснодар", description: "Город" },
  street: { type: "string", example: "Ленина", description: "Улица" },
  house: { type: "string", example: "1", description: "Дом" },
  latitude: { type: "string", example: "45.03", description: "Широта" },
  longitude: { type: "string", example: "38.97", description: "Долгота" },
};



// ====================================================
// SHOP PRODUCT
// ====================================================
export class UpdateShopProductBySellerDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsNumber()
  newStockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  newStatus?: ShopProductStatus;
};


class ShopProductImageDto {
  @Expose()
  @Type(() => String)
  imageId: string;

  @Expose()
  createdAt: Date;
}
class ProductPreviewDto {
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
export class ShopProductForSellerResponseDto {
  @Exclude()
  createdAt: Date;
  
  @Exclude()
  updatedAt: Date;

  @Expose()
  shopProductId: string;

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

}
