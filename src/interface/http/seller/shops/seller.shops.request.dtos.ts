import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { transformDtoToFormDataNumber } from 'src/common/utils';

// UPDATE SHOP
export class UpdateShopDto {
  @IsOptional()
  @IsString()
  aboutShop?: string | null;

  @IsOptional()
  @IsString()
  openAt?: string | null;

  @IsOptional()
  @IsString()
  closeAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Transform(transformDtoToFormDataNumber)
  minOrderSum?: number;
}


// CREATE SHOP
export class CreateShopDto {
  @IsOptional()
  @IsString()
  shopName?: string | null;

  @IsOptional()
  @IsString()
  aboutShop?: string | null;

  @IsOptional()
  @IsString()
  openAt?: string | null;

  @IsOptional()
  @IsString()
  closeAt?: string | null;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => typeof value === 'string' ? Number(value) : value)
  minOrderSum?: number;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  street?: string | null;

  @IsOptional()
  @IsString()
  house?: string | null;

  @IsOptional()
  @IsString()
  latitude?: string | null;

  @IsOptional()
  @IsString()
  longitude?: string | null;
}
