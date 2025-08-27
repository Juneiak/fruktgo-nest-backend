
import { Expose, Type } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsDate, IsBoolean} from 'class-validator';
import { UserSex, VerifiedStatus } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/schemas/employee.schema';
import {ShiftStatisticsDto} from 'src/modules/shop/shop.dtos';

class EmployerDto {
  @Expose()
  sellerId: string;

  @Expose()
  companyName: string;
}
class PinnedToDto {
  @Expose()
  shopId: string;

  @Expose()
  shopName: string;
}
export class EmployeeForAdminPreviewResponseDto {
  @Expose()
  internalNote: string | null;

  @Expose()
  employeeId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  @Type(() => String)
  employeeAvatar: string | null;

  @Expose()
  employeeName: string;

  @Expose()
  phone: string;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername: string | null;

  @Expose()
  telegramFirstName: string | null;

  @Expose()
  telegramLastName: string | null;

  @Expose()
  sex?: UserSex

  @Expose()
  status: EmployeeStatus;

  @Expose()
  birthDate?: Date;

  @Expose()
  totalOrders: number;

  @Expose()
  totalShifts: number;

  @Expose()
  shiftRating: number;

  @Expose()
  @Type(() => PinnedToDto)
  pinnedTo: PinnedToDto;

  @Expose()
  @Type(() => EmployerDto)
  employer: EmployerDto;

  @Expose()
  lastLoginAt?: Date;
};

export class EmployeeForAdminFullResponseDto {
  @Expose()
  internalNote: string | null;

  @Expose()
  employeeId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  @Type(() => String)
  employeeAvatar: string | null;

  @Expose()
  employeeName: string;

  @Expose()
  phone: string;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername: string | null;

  @Expose()
  telegramFirstName: string | null;

  @Expose()
  telegramLastName: string | null;

  @Expose()
  sex?: UserSex

  @Expose()
  status: EmployeeStatus;

  @Expose()
  birthDate?: Date;

  @Expose()
  position?: string;

  @Expose()
  salary?: string;

  @Expose()
  totalOrders: number;

  @Expose()
  totalShifts: number;

  @Expose()
  shiftRating: number;

  @Expose()
  @Type(() => PinnedToDto)
  pinnedTo: PinnedToDto;

  @Expose()
  @Type(() => EmployerDto)
  employer: EmployerDto;

  @Expose()
  lastLoginAt?: Date;
}


class ShopDto {
  @Expose()
  shopId: string;

  @Expose()
  shopName: string;
}
export class EmployeeShiftPreviewResponseDto {
  @Expose()
  shiftId: string;

  @Expose()
  @Type(() => ShopDto)
  shop: ShopDto;
  
  @Expose()
  openedAt: Date;
  
  @Expose()
  closedAt: Date | null;
  
  @Expose()
  @Type(() => ShiftStatisticsDto)
  statistics: ShiftStatisticsDto;
}

export class UpdateEmployeeByAdminDto {
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