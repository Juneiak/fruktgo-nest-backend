import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { IsValidPhoneNumber } from 'src/common/validators';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  position?: string;
  
  @IsNumber()
  @IsOptional()
  salary?: number;
  
  @IsString()
  @IsOptional()
  pinnedTo?: string | null;
  
  @IsString()
  @IsOptional()
  sellerNote?: string;
}


export class RequestToEmployeeDto {
  @IsString()
  @IsValidPhoneNumber()
  @IsNotEmpty({ message: 'Телефон обязательно' })
  employeePhoneNumber: string;
}