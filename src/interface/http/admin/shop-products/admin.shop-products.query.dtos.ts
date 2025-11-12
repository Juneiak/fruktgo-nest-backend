import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ShopProductEnums } from 'src/modules/shop-product';

export class ShopProductQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ShopProductEnums.ShopProductStatus, { each: true })
  statuses?: ShopProductEnums.ShopProductStatus[];
}