import { IsOptional, IsString } from 'class-validator';

export class ShopProductQueryDto {
  @IsOptional()
  @IsString()
  shopId?: string;
}