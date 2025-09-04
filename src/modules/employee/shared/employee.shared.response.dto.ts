import { Expose } from 'class-transformer';
import { RequestToEmployeeStatus } from "src/modules/employee/request-to-employee.schema";
import { VerifiedStatus, UserSex } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

class ShopDto {
  @ExposeObjectId() shopId: string;
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
  @Expose() lastLoginAt?: Date;
};

class EmployerDto {
  @ExposeObjectId() sellerId: string;
  @Expose() companyName: string;
}

export class RequestToEmployeeResponseDto {
  @Expose() from: EmployerDto;
  @Expose() id: string;
  @Expose() createdAt: Date;
  @ExposeObjectId() to: any;
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
  @ExposeObjectId() employeeAvatar: string | null;
}