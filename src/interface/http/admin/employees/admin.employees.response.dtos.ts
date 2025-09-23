import { Expose, Type } from 'class-transformer';
import { UserSex, VerifiedStatus } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class EmployerDto {
  @Expose() sellerId: string;
  @Expose() companyName: string;}

class PinnedToDto {
  @Expose() shopId: string;
  @Expose() shopName: string;
}

export class EmployeePreviewResponseDto {
  @Expose() internalNote: string | null;
  @Expose() employeeId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() employeeAvatar: string | null;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername: string | null;
  @Expose() telegramFirstName: string | null;
  @Expose() telegramLastName: string | null;
  @Expose() sex?: UserSex
  @Expose() status: EmployeeStatus;
  @Expose() birthDate?: Date;
  @Expose() totalOrders: number;
  @Expose() totalShifts: number;
  @Expose() shiftRating: number;
  @Expose() @Type(() => PinnedToDto) pinnedTo: PinnedToDto;
  @Expose() @Type(() => EmployerDto) employer: EmployerDto;
  @Expose() lastLoginAt?: Date;
};


export class EmployeeFullResponseDto {
  @Expose() internalNote: string | null;
  @Expose() employeeId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() employeeAvatar: string | null;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername: string | null;
  @Expose() telegramFirstName: string | null;
  @Expose() telegramLastName: string | null;
  @Expose() sex?: UserSex
  @Expose() status: EmployeeStatus;
  @Expose() birthDate?: Date;
  @Expose() position?: string;
  @Expose() salary?: string;
  @Expose() totalOrders: number;
  @Expose() totalShifts: number;
  @Expose() shiftRating: number;
  @Expose() @Type(() => PinnedToDto) pinnedTo: PinnedToDto;
  @Expose() @Type(() => EmployerDto) employer: EmployerDto;
  @Expose() lastLoginAt?: Date;
}