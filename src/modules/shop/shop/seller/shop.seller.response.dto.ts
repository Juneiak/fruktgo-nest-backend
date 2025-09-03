import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from 'src/modules/shop/schemas/shop.schema';
import { ShiftPreviewResponseDto } from 'src/modules/shop/shift/seller/shift.seller.response.dto';

class ShopAddressDto {
  @Expose() city: string;
  @Expose() street: string;
  @Expose() house: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
}

export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @Expose() @Type(() => String) shopImage?: string | null;
  @Expose() aboutShop?: string | null;
  @Expose() @Type(() => ShopAddressDto) address?: ShopAddressDto | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() avgRating: number;
  @Expose() totalSales: number;
  @Expose() ratingsCount: number;
  @Expose() totalOrders: number;
  @Expose() minOrderSum: number;
  @Expose() lastShiftDate?: Date | null;
  @Expose() shopOrdersCount: number;
  @Expose() shopProductsCount: number;
  @Expose() pinnedEmployeesCount: number;
  @Expose() createdAt: Date;
}

export class ShopFullResponseDto {
  @Expose() shopId: string;
  @Expose() @Type(() => String) owner: any;
  @Expose() phone: string | null;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @Expose() @Type(() => String) shopImage?: string | null;
  @Expose() aboutShop?: string | null;
  @Expose() @Type(() => ShopAddressDto) address?: ShopAddressDto | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() avgRating: number;
  @Expose() totalSales: number;
  @Expose() ratingsCount: number;
  @Expose() totalOrders: number;
  @Expose() minOrderSum: number;
  @Expose() lastShiftDate?: Date | null;
  @Expose() shopOrdersCount: number;
  @Expose() shopProductsCount: number;
  @Expose() pinnedEmployeesCount: number;
  @Expose() sellerNote?: string | null;
  @Expose() createdAt: Date;
  @Expose() @Type(() => ShiftPreviewResponseDto) currentShift?: ShiftPreviewResponseDto;
}
