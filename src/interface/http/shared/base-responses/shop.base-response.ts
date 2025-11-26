/**
 * Shop Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseShopResponseDto, [...])
 */

import { Expose, Type } from 'class-transformer';
import { Shop, ShopStatistics } from 'src/modules/shop/shop.schema';
import { ShopStatus } from 'src/modules/shop/shop.enums';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { BlockedResponseDto } from '../shared.response.dtos';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IShopStatistics {
  avgRating: ShopStatistics['avgRating'];
  totalSales: ShopStatistics['totalSales'];
  ratingsCount: ShopStatistics['ratingsCount'];
  ordersCount: ShopStatistics['ordersCount'];
  productsCount: ShopStatistics['productsCount'];
  employeesCount: ShopStatistics['employeesCount'];
}

export interface IShopResponse {
  shopId: string;
  city: Shop['city'];
  account: string;
  owner: string;
  blocked: BlockedResponseDto;
  verifiedStatus: Shop['verifiedStatus'];
  shopName: Shop['shopName'];
  shopImage?: string | null;
  aboutShop?: Shop['aboutShop'];
  address?: string | null;
  status: Shop['status'];
  openAt?: Shop['openAt'];
  closeAt?: Shop['closeAt'];
  statistics: IShopStatistics;
  minOrderSum: Shop['minOrderSum'];
  currentShift: string | null;
  sellerNote?: Shop['sellerNote'];
  internalNote?: Shop['internalNote'];
  activeOrders: string[];
  acceptanceTimeLimit: Shop['acceptanceTimeLimit'];
  assemblyTimeLimit: Shop['assemblyTimeLimit'];
  minWeightDifferencePercentage: Shop['minWeightDifferencePercentage'];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseShopStatisticsDto implements IShopStatistics {
  @Expose() avgRating: number;
  @Expose() totalSales: number;
  @Expose() ratingsCount: number;
  @Expose() ordersCount: number;
  @Expose() productsCount: number;
  @Expose() employeesCount: number;
}

export class BaseShopResponseDto implements IShopResponse {
  @Expose() shopId: string;
  @Expose() city: string;
  @ExposeObjectId() account: string;
  @ExposeObjectId() owner: string;
  @Expose() @Type(() => BlockedResponseDto) blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: string | null;
  @Expose() aboutShop?: string;
  @ExposeObjectId() address?: string | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string;
  @Expose() closeAt?: string;
  @Expose() @Type(() => BaseShopStatisticsDto) statistics: BaseShopStatisticsDto;
  @Expose() minOrderSum: number;
  @ExposeObjectId() currentShift: string | null;
  @Expose() sellerNote?: string;
  @Expose() internalNote?: string;
  @ExposeObjectId() activeOrders: string[];
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightDifferencePercentage: number;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
