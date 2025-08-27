
import { Expose, Type } from 'class-transformer';
import { LogDto } from 'src/common/modules/logs/logs.dtos';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from 'src/modules/shop/schemas/shop.schema';
import { OpenedBy, ClosedBy, Statistics } from '../schemas/shift.schema';
import { Types } from 'mongoose';
import { OrderDeliveryInfoDto, OrderedByDto, OrderFinanceInfoDto, OrderRatingDto } from 'src/modules/order/order.dtos';
import { OrderStatus } from 'src/modules/order/order.schema';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from 'src/modules/product/product.schema';
import { ShopProductStatus } from 'src/modules/shop/schemas/shop-product.schema';

class OwnerDto {
  @Expose()
  sellerId: string;

  @Expose()
  companyName: string;
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

export class ShopForAdminPreviewResponseDto {
  @Expose()
  shopId: string;

  @Expose()
  @Type(() => OwnerDto)
  owner: OwnerDto;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  shopName: string;

  @Expose()
  @Type(() => String)
  shopImage: Types.ObjectId;

  @Expose()
  @Type(() => ShopAddressDto)
  address: ShopAddressDto;

  @Expose()
  status: ShopStatus;

  @Expose()
  openAt: string;

  @Expose()
  closeAt: string;

  @Expose()
  avgRating: number;

  @Expose()
  totalSales: number;

  @Expose()
  ratingsCount: number;

  @Expose()
  minOrderSum: number;

  @Expose()
  lastShiftDate: Date;

  @Expose()
  shopOrdersCount: number;

  @Expose()
  shopProductsCount: number;

  @Expose()
  pinnedEmployeesCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  currentShift: string;

  @Expose()
  internalNote: string | null;
};


class PinnedEmployeeDto {
  @Expose()
  employeeId: string;

  @Expose()
  employeeName: string;

  @Expose()
  @Type(() => String)
  employeeAvatar?: Types.ObjectId;

  @Expose()
  phone?: string | null;

  @Expose()
  telegramUsername?: string | null;

  @Expose()
  position?: string | null;

  @Expose()
  salary?: number | null;

  @Expose()
  shiftRating?: number | null;

  @Expose()
  totalOrders?: number | null;

  @Expose()
  totalShifts?: number | null;

  @Expose()
  status?: string | null;

  @Expose()
  verifiedStatus?: VerifiedStatus;

  @Expose()
  isBlocked?: boolean;

  @Expose()
  internalNote?: string | null;
}
export class ShopForAdminFullResponseDto {
  @Expose()
  shopId: string;

  @Expose()
  @Type(() => OwnerDto)
  owner: OwnerDto;

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
  shopImage?: Types.ObjectId | null;

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
  @Type(() => PinnedEmployeeDto)
  pinnedEmployees: PinnedEmployeeDto[];

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

  @Expose()
  internalNote: string | null;
};

export class UpdateShopByAdminDto {
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @IsEnum(VerifiedStatus)
  @IsOptional()
  verifiedStatus?: VerifiedStatus;

  @IsString()
  @IsOptional()
  internalNote?: string | null;
}


export class ShopShiftForAdminPreviewResponceDto {
  @Expose()
  shiftId: string;

  @Expose()
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
  
  @Expose()
  openedAt: Date;

  @Expose()
  openComment: string | null;

  @Expose()
  closedAt: Date | null;

  @Expose()
  closeComment: string | null;

  @Expose()
  openedBy: OpenedBy;

  @Expose()
  closedBy: ClosedBy | null;

  @Expose()
  statistics: Statistics;
}

class OrderForAdminDto {
  @Expose()
  orderId: string;

  @Expose()
  orderedBy: OrderedByDto;

  @Expose()
  orderStatus: OrderStatus;

  @Expose()
  orderedAt: Date;  

  @Expose()
  @Type(() => OrderDeliveryInfoDto)
  delivery: OrderDeliveryInfoDto;

  @Expose()
  @Type(() => OrderFinanceInfoDto)
  finances: OrderFinanceInfoDto;

  @Expose()
  @Type(() => OrderRatingDto)
  rating: OrderRatingDto | null;
  
};

export class ShopShiftForAdminFullResponseDto {
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
  closedAt: Date | null;

  @Expose()
  closeComment: string | null;

  @Expose()
  openedBy: OpenedBy;

  @Expose()
  closedBy: ClosedBy | null;

  @Expose()
  statistics: Statistics;

  @Expose()
  @Type(() => LogDto)
  logs: LogDto[];

  @Expose()
  @Type(() => OrderForAdminDto)
  orders: OrderForAdminDto[];
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

export class ShopProductForAdminFullResponseDto {
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
};


export class ShopProductForAdminPreviewResponseDto {
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
}


export class ShiftFilterQuery {
  @IsString()
  @IsOptional()
  shopId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;
}