import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SelectShopForCartDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;
}


export class UpdateProductInCartDto {
  @IsString()
  @IsNotEmpty()
  shopProductId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}


export class RemoveProductInCartDto {
  @IsString()
  @IsNotEmpty()
  shopProductId: string;
}