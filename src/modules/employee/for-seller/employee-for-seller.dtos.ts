import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { IsValidPhoneNumber } from 'src/common/validators';
import { RequestToEmployeeStatus } from 'src/modules/employee/schemas/request-to-employee.schema';
import { UserSex, VerifiedStatus } from 'src/common/types';
import { EmployeeStatus } from 'src/modules/employee/schemas/employee.schema';

export class EmployeeForSellerResponseDto {
  @Expose()
  sellerNote: string;

  @Expose()
  employeeId: string;

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
  @Type(() => String)
  employer?: any;

  @Expose()
  @Type(() => String)
  pinnedTo: any;
};

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  position: string | null;
  
  @IsNumber()
  @IsOptional()
  salary: number | null;
  
  @IsString()
  @IsOptional()
  pinnedTo: string;
  
  @IsString()
  @IsOptional()
  sellerNote: string | null;
}

export class RequestToEmployeeFromSellerDto {
  @IsString()
  @IsValidPhoneNumber()
  @IsNotEmpty({ message: 'Телефон обязательно' })
  employeePhoneNumber: string;
}

class ToOfRequestToEmployeeDto {
  @Expose()
  employeeName: string;

  @Expose()
  phone: string;

  @Expose()
  telegramUsername: string;
}

export class RequestToEmployeeToSellerResponseDto {
  @Expose()
  id: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => ToOfRequestToEmployeeDto)
  to: ToOfRequestToEmployeeDto;

  @Expose()
  @Type(() => String)
  from: string;

  @Expose()
  requestStatus: RequestToEmployeeStatus;
}