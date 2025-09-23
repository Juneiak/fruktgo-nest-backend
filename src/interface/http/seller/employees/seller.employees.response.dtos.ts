import { Expose, Type } from 'class-transformer';
import { RequestToEmployeeStatus } from 'src/modules/employee/request-to-employee.schema';
import { UserSex, VerifiedStatus } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/employee.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class EmployeeResponseDto {
  @Expose() sellerNote: string;
  @Expose() employeeId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() employeeAvatar: string | null;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername: string | null;
  @Expose() sex?: UserSex
  @Expose() status: EmployeeStatus;
  @Expose() birthDate?: Date;
  @Expose() position?: string;
  @Expose() salary?: string;
  @Expose() totalOrders: number;
  @Expose() totalShifts: number;
  @Expose() shiftRating: number;
  @ExposeObjectId() employer?: any;
  @ExposeObjectId() pinnedTo: any;
};


class ToOfRequestToEmployeeDto {
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramUsername: string;
}

export class RequestToEmployeeResponseDto {
  @Expose() id: string;
  @Expose() createdAt: Date;
  @Expose() @Type(() => ToOfRequestToEmployeeDto) to: ToOfRequestToEmployeeDto;
  @ExposeObjectId() from: string;
  @Expose() requestStatus: RequestToEmployeeStatus;
}