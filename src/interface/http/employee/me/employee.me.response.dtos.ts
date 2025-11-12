import { Expose, Type } from 'class-transformer';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import { EmployeeEnums } from 'src/modules/employee';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { BlockedResponseDto } from 'src/interface/http/common/common.response.dtos';

class EmployeeStatisticsDto {
  @Expose() totalOrders: number;
  @Expose() totalShifts: number;
  @Expose() shiftRating: number;
}

export class EmployeeResponseDto {
  @Expose() employeeId: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() @Type(() => BlockedResponseDto) blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() employeeAvatar?: string | null;
  @Expose() employeeName: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string | null;
  @Expose() telegramFirstName?: string | null;
  @Expose() telegramLastName?: string | null;
  @Expose() sex: UserSex;
  @Expose() status: EmployeeEnums.EmployeeStatus;
  @Expose() birthDate?: Date | null;
  @Expose() position?: string | null;
  @Expose() salary?: string | null;
  @Expose() @Type(() => EmployeeStatisticsDto) statistics: EmployeeStatisticsDto;
  @ExposeObjectId() pinnedTo?: string | null;
  @ExposeObjectId() employer?: string | null;
  @ExposeObjectId() openedShift?: string | null;
  @Expose() lastLoginAt?: Date | null;
}
