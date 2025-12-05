import { Types } from 'mongoose';
import { ProductTemplateStatus, ProductUnit } from './product-template.enums';

/**
 * Получить по ID
 */
export class GetProductTemplateByIdQuery {
  constructor(public readonly templateId: Types.ObjectId | string) {}
}

/**
 * Получить по продавцу и товару
 */
export class GetProductTemplateByProductQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly productId: Types.ObjectId | string,
  ) {}
}

/**
 * Получить все шаблоны продавца
 */
export class GetProductTemplatesBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: ProductTemplateStatus | ProductTemplateStatus[];
      category?: Types.ObjectId | string;
      unit?: ProductUnit;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Поиск шаблонов
 */
export class SearchProductTemplatesQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      search?: string;
      status?: ProductTemplateStatus | ProductTemplateStatus[];
      category?: Types.ObjectId | string;
      hasBarcode?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить по штрихкоду
 */
export class GetProductTemplateByBarcodeQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Получить по SKU
 */
export class GetProductTemplateBySkuQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly sku: string,
  ) {}
}

/**
 * Получить количество шаблонов продавца
 */
export class CountProductTemplatesQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      status?: ProductTemplateStatus | ProductTemplateStatus[];
    },
  ) {}
}
