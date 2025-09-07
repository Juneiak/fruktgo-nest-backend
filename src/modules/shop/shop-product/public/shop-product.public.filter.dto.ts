import { IsNotEmpty, IsString } from 'class-validator';

export class ShopProductQueryFilterDto {
  @IsNotEmpty()
  @IsString()
  shopId: string;
}