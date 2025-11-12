import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ShopStatus } from 'src/modules/shop/shop.enums';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @ExposeObjectId() owner: Types.ObjectId;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage: Types.ObjectId;
  @ExposeObjectId() address: Types.ObjectId;
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
  @ExposeObjectId() pinnedEmployees: Types.ObjectId[];
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
}
