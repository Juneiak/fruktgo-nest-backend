import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ShopProductStatus } from "src/modules/shop-product/shop-product.schema";
import { ToNumber } from 'src/common/transformers/to-number.transformer';

export class RemoveShopProductImageDto {
  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateShopProductByEmployeeDto {
  @IsOptional()
  @ToNumber()
  @IsNumber()
  @Min(0, { message: 'Количество должно быть больше 0' })
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ShopProductStatus)
  status?: ShopProductStatus;

  @IsString()
  @IsOptional()
  comment?: string;
};
