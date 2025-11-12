import { IsString, IsOptional, IsNumber } from 'class-validator';

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