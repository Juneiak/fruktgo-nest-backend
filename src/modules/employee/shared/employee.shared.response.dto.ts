
import { IsEnum, IsString } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { RequestToEmployeeStatus } from "src/modules/employee/request-to-employee.schema";
import { VerifiedStatus, UserSex } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';

class ShopDto {
  @Expose() @Type(() => String) shopId: string;
  @Expose() shopName: string;
}

export class EmployeeResponseDto {
  @Expose() employer: EmployerDto | null;
  @Expose() pinnedTo: ShopDto | null;
  @Expose() employeeId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() @Type(() => String) employeeAvatar: string | null;
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
  @Expose() lastLoginAt?: Date;
};

class EmployerDto {
  @Expose() @Type(() => String) sellerId: string;
  @Expose() companyName: string;
}

export class RequestToEmployeeResponseDto {
  @Expose() from: EmployerDto;
  @Expose() id: string;
  @Expose() createdAt: Date;
  @Expose() @Type(() => String) to: any;
  @Expose() requestStatus: RequestToEmployeeStatus;
}



export class EmployeeTelegramBotResponseDto {
  @Expose() telegramId: number;
  @Expose() telegramUsername: string | null;
  @Expose() employeeId: string;
  @Expose() pinnedTo: ShopDto | null;
  @Expose() employer: EmployerDto | null;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: string;
  @Expose() employeeName: string;
  @Expose() position: string | null;
  @Expose() salary: string | null;
  @Expose() @Type(() => String) employeeAvatar: string | null;
}