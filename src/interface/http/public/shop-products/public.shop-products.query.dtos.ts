import { IsNotEmpty, IsString } from 'class-validator';

export class ShopProductQueryDto {
  @IsNotEmpty()
  @IsString()
  shopId: string;
}