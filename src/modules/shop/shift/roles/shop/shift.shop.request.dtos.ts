import { IsNotEmpty, IsString, IsOptional, IsISO8601 } from 'class-validator';

export class OpenShiftByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  openAt: string;

  @IsString()
  @IsOptional()
  comment?: string;
};

export class CloseShiftByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  @IsISO8601()
  closeAt: string;

  @IsOptional()
  @IsString()
  comment?: string;
};
