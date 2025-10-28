import { ProductCategory, ProductMeasuringScale, ProductStepRate } from "./product.enums";

export class CreateProductCommand {
  constructor(
    public readonly payload: {
      sellerId: string;
      productName: string;
      category: ProductCategory;
      price: number;
      measuringScale: ProductMeasuringScale;
      stepRate: ProductStepRate;
      aboutProduct?: string;
      origin?: string;
      productArticle?: string;
      cardImageFile?: Express.Multer.File;
    },
    public readonly productId?: string
  ) {}
}


export class UpdateProductCommand {
  constructor(
    public readonly productId: string,
    public readonly payload: {
      productName?: string;
      category?: ProductCategory;
      price?: number;
      measuringScale?: ProductMeasuringScale;
      stepRate?: ProductStepRate;
      aboutProduct?: string | null;
      origin?: string | null;
      productArticle?: string | null;
      cardImageFile?: Express.Multer.File;
    }
  ) {}
}

