import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";
import { transformDtoToFormDataNumber, transformDtoToFormDataString } from 'src/common/utils';

export class CreateProductDto {
    @IsOptional()
    @IsString()
    @Transform(transformDtoToFormDataString)
    productArticle?: string;
  
    @IsString()
    @IsNotEmpty()
    @Transform(transformDtoToFormDataString)
    productName: string;
  
    @IsEnum(ProductCategory)
    @Transform(transformDtoToFormDataString)
    category: ProductCategory;
  
    @IsNumber()
    @Min(1)
    @Transform(transformDtoToFormDataNumber)
    price: number;
  
    @IsEnum(ProductMeasuringScale)
    @Transform(transformDtoToFormDataString)
    measuringScale: ProductMeasuringScale;
  
    @IsEnum(ProductStepRate)
    @Transform(transformDtoToFormDataString)
    stepRate: ProductStepRate;
  
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
    @IsEnum(ProductStepRate)
    @Transform(transformDtoToFormDataString)
    stepRate?: ProductStepRate;
  
    @IsOptional()
    @IsString()
    @Transform(transformDtoToFormDataString)
    aboutProduct?: string;
  
    @IsOptional()
    @IsString()
    @Transform(transformDtoToFormDataString)
    origin?: string;
  }