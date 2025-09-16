import { IsOptional, IsString } from "class-validator";

export class EmployeeFilterDto {
  @IsString()
  @IsOptional()
  shopId: string;
}