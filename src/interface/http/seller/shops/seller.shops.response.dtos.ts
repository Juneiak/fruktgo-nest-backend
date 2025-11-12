import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ShopStatus } from 'src/modules/shop/shop.enums';
import { ShiftResponseDto } from 'src/interface/http/seller/shifts/seller.shifts.response.dtos';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: Types.ObjectId | null;
  @Expose() aboutShop?: string | null;
  @ExposeObjectId() address?: Types.ObjectId | null;
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
  @ExposeObjectId() owner: Types.ObjectId;
  @Expose() phone: string | null;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: Types.ObjectId | null;
  @Expose() aboutShop?: string | null;
  @ExposeObjectId() address?: Types.ObjectId | null;
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
