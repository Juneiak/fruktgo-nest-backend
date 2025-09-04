import {  IsNumber, IsOptional, IsString, IsEnum } from 'class-validator';
import { ShopProductStatus } from "src/modules/shop/shop-product/shop-product.schema";

export class UpdateShopProductDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsNumber()
  newStockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  newStatus?: ShopProductStatus;
};
