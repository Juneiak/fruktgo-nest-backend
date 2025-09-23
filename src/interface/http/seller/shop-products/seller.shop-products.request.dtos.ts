import {  IsOptional, IsString, IsEnum, IsNotEmpty, IsMongoId, IsNumber, Min  } from 'class-validator';
import { ShopProductStatus } from "src/modules/shop-product/shop-product.schema";
import { ToNumber } from 'src/common/transformers/to-number.transformer';


export class UpdateShopProductDto {
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  shopId: string;

  @IsOptional()
  @ToNumber()
  @IsNumber()
  @Min(0, { message: 'Количество должно быть больше 0' })
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  status?: ShopProductStatus;
}