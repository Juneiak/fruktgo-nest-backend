import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class SellerPreviewResponseDto {
  @Expose() sellerId: string;
  @ExposeObjectId() sellerLogo: string;
  @Expose() companyName: string;
  @Expose() inn: number;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() totalSales: number;
  @Expose() totalOrders: number;
  @Expose() lastLoginDate?: Date | null;
  @Expose() shopsCount: number;
  @Expose() employeesCount: number;
  @Expose() productsCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() lastLoginAt?: Date | null;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() internalNote: string | null;
}

class ShopDto {
  @Expose() shopId: string;
  @Expose() shopName: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() shopImage: Types.ObjectId;
  @Expose() address: string;
  @Expose() status: string;
  @Expose() openAt: Date;
  @Expose() closeAt: Date;
  @Expose() avgRating: number;
  @Expose() totalSales: number;
  @Expose() ratingsCount: number;
  @Expose() minOrderSum: number;
  @Expose() lastShiftDate: Date;
  @Expose() shopOrdersCount: number;
  @Expose() shopProductsCount: number;
  @Expose() createdAt: Date;
}

class EmployeeDto {
  @Expose() employeeId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() employeeAvatar: Types.ObjectId;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() sex: string;
  @Expose() status: string;
  @ExposeObjectId() pinnedTo: Types.ObjectId;
}

export class SellerFullResponseDto {
  @Expose() sellerId: string;
  @ExposeObjectId() sellerLogo: string;
  @Expose() companyName: string;
  @Expose() inn: number;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() totalSales: number;
  @Expose() totalOrders: number;
  @Expose() lastLoginDate?: Date | null;
  @Expose() shopsCount: number;
  @Expose() employeesCount: number;
  @Expose() productsCount: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() lastLoginAt?: Date | null;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() internalNote: string | null;
  @Expose() @Type(() => EmployeeDto) employees: EmployeeDto[];
  @Expose() @Type(() => ShopDto) shops: ShopDto[];
}