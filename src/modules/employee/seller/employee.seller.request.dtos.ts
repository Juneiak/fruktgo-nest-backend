import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { IsValidPhoneNumber } from 'src/common/validators';

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


export class RequestToEmployeeDto {
  @IsString()
  @IsValidPhoneNumber()
  @IsNotEmpty({ message: 'Телефон обязательно' })
  employeePhoneNumber: string;
}