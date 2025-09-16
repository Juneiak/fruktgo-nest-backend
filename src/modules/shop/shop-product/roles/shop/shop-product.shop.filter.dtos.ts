import { IsArray, IsNotEmpty, IsMongoId } from 'class-validator';

export class ShopProductStockQueryFilterDto {
  @IsNotEmpty({ each: true })
  @IsArray()
  @IsMongoId({ each: true })
  shopProductIds: string[];
}