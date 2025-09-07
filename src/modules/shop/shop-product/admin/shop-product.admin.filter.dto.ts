import { IsOptional, IsString } from 'class-validator';

export class ShopProductQueryFilterDto {
  @IsOptional()
  @IsString()
  shopId?: string;
}