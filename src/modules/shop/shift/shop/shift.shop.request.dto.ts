import { IsNotEmpty, IsDate, IsString, IsOptional } from 'class-validator';


export class OpenShiftByEmployeeDto {
  @IsNotEmpty()
  @IsString()
  openAt: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class CloseShiftByEmployeeDto {
  @IsNotEmpty()
  @IsDate()
  @IsOptional()
  closeAt: Date;

  @IsString()
  @IsOptional()
  comment: string;
}
