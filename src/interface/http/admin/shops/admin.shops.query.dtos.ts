import { IsOptional, IsString, IsEnum } from "class-validator";
import { ShopEnums } from "src/modules/shop";

export class ShopQueryFilterDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(ShopEnums.ShopStatus)
  statuses?: ShopEnums.ShopStatus[];
}