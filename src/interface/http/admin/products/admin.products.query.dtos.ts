import { IsOptional, IsString, IsEnum } from "class-validator";
import { ProductEnums } from "src/modules/product";

export class ProductQueryFilterDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(ProductEnums.ProductCategory)
  category?: ProductEnums.ProductCategory;
}