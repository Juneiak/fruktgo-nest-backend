import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class ShopProductStockQueryFilterDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  shopProductIds: string[];
}