import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ShopStatus } from 'src/modules/shop/shop/shop.schema';
import { ShiftResponseDto } from 'src/modules/shop/shift/roles/seller/shift.seller.response.dtos';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

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
  @ExposeObjectId() shopImage?: string | null;
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
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
}

export class ShopFullResponseDto {
  @Expose() shopId: string;
  @ExposeObjectId() owner: any;
  @Expose() phone: string | null;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: string | null;
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
  @Expose() @Type(() => ShiftResponseDto) currentShift?: ShiftResponseDto;
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
}
