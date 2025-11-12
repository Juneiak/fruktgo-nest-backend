import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { transformDtoToFormDataNumber, transformDtoToFormDataString } from 'src/common/utils';
import { ProductEnums } from 'src/modules/product';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  productArticle?: string;

  @IsNotEmpty()
  @IsString()
  @Transform(transformDtoToFormDataString)
  productName: string;

  @IsNotEmpty()
  @IsEnum(ProductEnums.ProductCategory)
  @Transform(transformDtoToFormDataString)
  category: ProductEnums.ProductCategory;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(transformDtoToFormDataNumber)
  price: number;

  @IsNotEmpty()
  @IsEnum(ProductEnums.ProductMeasuringScale)
  @Transform(transformDtoToFormDataString)
  measuringScale: ProductEnums.ProductMeasuringScale;

  @IsNotEmpty()
  @IsEnum(ProductEnums.ProductStepRate)
  @Transform(transformDtoToFormDataString)
  stepRate: ProductEnums.ProductStepRate;

  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  aboutProduct?: string;

  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  origin?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  productArticle?: string;

  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  productName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(transformDtoToFormDataNumber)
  price?: number;

  @IsOptional()
  @IsEnum(ProductEnums.ProductStepRate)
  @Transform(transformDtoToFormDataString)
  stepRate?: ProductEnums.ProductStepRate;

  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  aboutProduct?: string;

  @IsOptional()
  @IsString()
  @Transform(transformDtoToFormDataString)
  origin?: string;
}