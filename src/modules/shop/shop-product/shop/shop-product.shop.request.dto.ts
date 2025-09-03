import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ShopProductStatus } from "src/modules/shop/schemas/shop-product.schema";

export class RemoveShopProductImageDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateShopProductByEmployeeDto {
  @IsOptional()
  @IsNumber()
  newStockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  newStatus?: ShopProductStatus;

  @IsString()
  @IsOptional()
  comment?: string;
};
