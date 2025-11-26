/**
 * ShopProduct Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseShopProductResponseDto, [...])
 */

import { Expose } from 'class-transformer';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { ShopProductStatus } from 'src/modules/shop-product/shop-product.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IShopProductResponse {
  shopProductId: string;
  pinnedTo: string;
  product: string;
  stockQuantity: ShopProduct['stockQuantity'];
  status: ShopProduct['status'];
  last7daysSales: ShopProduct['last7daysSales'];
  last7daysWriteOff: ShopProduct['last7daysWriteOff'];
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseShopProductResponseDto implements IShopProductResponse {
  @Expose() shopProductId: string;
  @ExposeObjectId() pinnedTo: string;
  @ExposeObjectId() product: string;
  @Expose() stockQuantity: number;
  @Expose() status: ShopProductStatus;
  @Expose() last7daysSales: number;
  @Expose() last7daysWriteOff: number;
  @ExposeObjectId() images: string[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
