import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "./product.enums";

export type CreateProductPayload = {
  productName: string;
  category: ProductCategory;
  price: number;
  measuringScale: ProductMeasuringScale;
  stepRate: ProductStepRate;
  aboutProduct?: string;
  origin?: string;
  productArticle?: string;
  cardImage?: Express.Multer.File;
}

export class CreateProductCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: CreateProductPayload
  ) {}
}

export type UpdateProductPayload = {
  productName?: string;
  category?: ProductCategory;
  price?: number;
  measuringScale?: ProductMeasuringScale;
  stepRate?: ProductStepRate;
  aboutProduct?: string | null;
  origin?: string | null;
  productArticle?: string | null;
  cardImage?: Express.Multer.File;
}

export class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly payload: UpdateProductPayload
  ) {}
}

export class DeleteProductCommand {
  constructor(
    public readonly productId: string
  ) {}
}
