import {  IsString, IsNotEmpty } from 'class-validator';

export class UpdateShopProductDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;
};
