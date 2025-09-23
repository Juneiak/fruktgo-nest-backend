import { IsOptional, IsString } from "class-validator";

export class EmployeeQueryFilterDto {
  @IsString()
  @IsOptional()
  shopId: string;
}