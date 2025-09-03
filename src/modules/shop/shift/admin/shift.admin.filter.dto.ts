import { IsString, IsOptional, IsDate } from "class-validator";

export class ShiftFilterQuery {
  @IsString()
  @IsOptional()
  shopId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;
}