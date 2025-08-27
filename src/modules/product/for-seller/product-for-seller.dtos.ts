import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsUrl } from 'class-validator';
import { Transform, Expose, Type } from 'class-transformer';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "src/modules/product/product.schema";
import { SwaggerSchemaProperties } from 'src/common/swagger/api-form-data.decorator';
import { transformDtoToFormDataNumber, transformDtoToFormDataString } from 'src/common/utils';
import {ShopProductStatus} from 'src/modules/shop/schemas/shop-product.schema'
import { Types } from 'mongoose';
import {LogDto} from 'src/common/modules/logs/logs.dtos'


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

export const CreateProductFormDataDto: SwaggerSchemaProperties = {
  productName: {type: "string", example: "Яблоко Гала", description: "Название продукта" },
  category: { type: "string", example: ProductCategory.FRUITS, description: "Категория продукта" },
  price: { type: "number", example: 85, description: "Цена продукта" },
  measuringScale: { type: "string", example: ProductMeasuringScale.KG, description: "Единица измерения" },
  stepRate: { type: "number", example: ProductStepRate.STEP_1, description: "Шаг заказа" },
  aboutProduct: { type: "string", example: "Сочное красное яблоко", description: "Описание продукта" },
  origin: { type: "string", example: "Краснодарский край", description: "Место происхождения" },
  productArticle: { type: "string", example: "ЯБЛ123", description: "Артикул продукта" },
};


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

export const UpdateProductFormDataDto: SwaggerSchemaProperties = {
  productArticle: { type: "string", example: "ЯБЛ123", description: "Артикул продукта" },
  productName: { type: "string", example: "Яблоко Гала", description: "Название продукта" },
  price: { type: "number", example: 89.99, description: "Цена продукта" },
  stepRate: { type: "string", example: ProductStepRate.STEP_1, description: "Шаг заказа" },
  aboutProduct: { type: "string", example: "Сочное красное яблоко с кисло-сладким вкусом", description: "Описание продукта" },
  origin: { type: "string", example: "Краснодарский край", description: "Место происхождения" },
};


export class ProductForSellerPreviewResponseDto {
  @Expose()
  productId: string;

  @Expose()
  @Type(() => String)
  cardImage: Types.ObjectId;

  @Expose()
  productArticle?: string | null;

  @Expose()
  productName: string;

  @Expose()
  category: ProductCategory;

  @Expose()
  price: number;

  @Expose()
  measuringScale: ProductMeasuringScale;

  @Expose()
  stepRate: ProductStepRate;

  @Expose()
  aboutProduct?: string;

  @Expose()
  totalLast7daysSales: number;

  @Expose()
  totalLast7daysWriteOff: number;

  @Expose()
  origin?: string;

  @Expose()
  totalStockQuantity: number;

  @Expose()
  owner: any;
}

class ShopDto {
  @Expose()
  @Type(() => String)
  shopId: string;

  @Expose()
  @Type(() => String)
  shopImage: string;

  @Expose()
  shopName: string;
}


export class ShopProductResponseDto {
  @Expose()
  shopProductId: string;

  @Expose()
  @Type(() => ShopDto)
  pinnedTo: ShopDto;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;

  @Expose()
  last7daysSales: number;

  @Expose()
  last7daysWriteOff: number;
}


export class ProductForSellerFullResponseDto {
  @Expose()
  productId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => String)
  cardImage: Types.ObjectId;

  @Expose()
  productArticle?: string | null;

  @Expose()
  productName: string;

  @Expose()
  category: ProductCategory;

  @Expose()
  price: number;

  @Expose()
  measuringScale: ProductMeasuringScale;

  @Expose()
  stepRate: ProductStepRate;

  @Expose()
  aboutProduct?: string;

  @Expose()
  totalLast7daysSales: number;

  @Expose()
  totalLast7daysWriteOff: number;

  @Expose()
  origin?: string;

  @Expose()
  totalStockQuantity: number;

  @Expose()
  owner: any;

  @Expose()
  @Type(() => ShopProductResponseDto)
  shopProducts: ShopProductResponseDto;
}




export class OfShopProduct {
  @Expose()
  shopProductId: string;

  @Expose()
  @Type(() => String)
  pinnedTo: string;

  @Expose()
  stockQuantity: number;

  @Expose()
  status: ShopProductStatus;

  @Expose()
  last7daysSales: number;

  @Expose()
  last7daysWriteOff: number;
}
export class ProductForSellerOfShopResponseDto {
  @Expose()
  productId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => String)
  cardImage: Types.ObjectId;

  @Expose()
  productArticle?: string | null;

  @Expose()
  productName: string;

  @Expose()
  category: ProductCategory;

  @Expose()
  price: number;

  @Expose()
  measuringScale: ProductMeasuringScale;

  @Expose()
  stepRate: ProductStepRate;

  @Expose()
  aboutProduct?: string;

  @Expose()
  totalLast7daysSales: number;

  @Expose()
  totalLast7daysWriteOff: number;

  @Expose()
  origin?: string;

  @Expose()
  totalStockQuantity: number;

  @Expose()
  owner: any;

  @Expose()
  @Type(() => OfShopProduct)
  shopProducts: OfShopProduct[];
}