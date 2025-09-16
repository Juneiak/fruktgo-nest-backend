import { IsOptional, IsString } from "class-validator";

export class ProductQueryFilterDto {
  @IsOptional()
  @IsString()
  sellerId?: string;  
}