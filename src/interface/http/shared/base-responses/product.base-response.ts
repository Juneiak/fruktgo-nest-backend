/**
 * Product Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseProductResponseDto, [...])
 */

import { Expose, Type } from 'class-transformer';
import { Product, ProductStatistics } from 'src/modules/product/product.schema';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from 'src/modules/product/product.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IProductStatistics {
  totalLast7daysSales: ProductStatistics['totalLast7daysSales'];
  totalSales: ProductStatistics['totalSales'];
  totalLast7daysWriteOff: ProductStatistics['totalLast7daysWriteOff'];
}

export interface IProductResponse {
  productId: string;
  cardImage?: string | null;
  productArticle?: Product['productArticle'];
  productName: Product['productName'];
  category: Product['category'];
  totalStockQuantity: Product['totalStockQuantity'];
  price: Product['price'];
  measuringScale: Product['measuringScale'];
  stepRate: Product['stepRate'];
  aboutProduct?: Product['aboutProduct'];
  statistics: IProductStatistics;
  origin?: Product['origin'];
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseProductStatisticsDto implements IProductStatistics {
  @Expose() totalLast7daysSales: number;
  @Expose() totalSales: number;
  @Expose() totalLast7daysWriteOff: number;
}

export class BaseProductResponseDto implements IProductResponse {
  @Expose() productId: string;
  @ExposeObjectId() cardImage?: string | null;
  @Expose() productArticle?: string;
  @Expose() productName: string;
  @Expose() category: ProductCategory;
  @Expose() totalStockQuantity: number;
  @Expose() price: number;
  @Expose() measuringScale: ProductMeasuringScale;
  @Expose() stepRate: ProductStepRate;
  @Expose() aboutProduct?: string;
  @Expose() @Type(() => BaseProductStatisticsDto) statistics: BaseProductStatisticsDto;
  @Expose() origin?: string;
  @ExposeObjectId() owner: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
