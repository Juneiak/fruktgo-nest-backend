import {  IsString, IsNotEmpty } from 'class-validator';

export class ShopProductsQueryDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;
};
