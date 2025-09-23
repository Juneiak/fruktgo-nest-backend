import { IsArray, IsNotEmpty, IsMongoId } from 'class-validator';

export class ShopProductsStockQueryDto {
  @IsNotEmpty({ each: true })
  @IsArray()
  @IsMongoId({ each: true })
  shopProductIds: string[];
}