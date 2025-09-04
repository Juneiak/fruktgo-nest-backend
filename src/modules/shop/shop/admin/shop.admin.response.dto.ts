import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from 'src/modules/shop/shop/shop.schema';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class OwnerDto {
  @Expose() sellerId: string;
  @Expose() companyName: string;
}

class ShopAddressDto {
  @Expose() city: string;
  @Expose() street: string;
  @Expose() house: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
}
export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @Expose() @Type(() => OwnerDto) owner: OwnerDto;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage: Types.ObjectId;
  @Expose() @Type(() => ShopAddressDto) address: ShopAddressDto;
  @Expose() status: ShopStatus;
  @Expose() openAt: string;
  @Expose() closeAt: string;
  @Expose() avgRating: number;
  @Expose() totalSales: number;
  @Expose() ratingsCount: number;
  @Expose() minOrderSum: number;
  @Expose() lastShiftDate: Date;
  @Expose() shopOrdersCount: number;
  @Expose() shopProductsCount: number;
  @Expose() pinnedEmployeesCount: number;
  @Expose() createdAt: Date;
  @Expose() currentShift: string;
  @Expose() internalNote: string | null;
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
};

class PinnedEmployeeDto {
  @Expose() employeeId: string;
  @Expose() employeeName: string;
  @ExposeObjectId() employeeAvatar?: Types.ObjectId;
  @Expose() phone?: string | null;
  @Expose() telegramUsername?: string | null;
  @Expose() position?: string | null;
  @Expose() salary?: number | null;
  @Expose() shiftRating?: number | null;
  @Expose() totalOrders?: number | null;
  @Expose() totalShifts?: number | null;
  @Expose() status?: string | null;
  @Expose() verifiedStatus?: VerifiedStatus;
  @Expose() isBlocked?: boolean;
  @Expose() internalNote?: string | null;
}

export class ShopFullResponseDto {
  @Expose() shopId: string;
  @Expose() @Type(() => OwnerDto) owner: OwnerDto;
  @Expose() phone: string | null;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: Types.ObjectId | null;
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
  @Expose() @Type(() => PinnedEmployeeDto) pinnedEmployees: PinnedEmployeeDto[];
  @Expose() shopProducts: any[];
  @Expose() shopOrders: any[];
  @Expose() shopShifts: any[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() currentShift: any | null;
  @Expose() activeOrders: any[];
  @Expose() internalNote: string | null;
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
};
