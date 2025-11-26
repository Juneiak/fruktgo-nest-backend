/**
 * Seller Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseSellerResponseDto, [...])
 */

import { Expose, Type } from 'class-transformer';
import { Seller, SellerStatistics } from 'src/modules/seller/seller.schema';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { BlockedResponseDto } from '../shared.response.dtos';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface ISellerStatistics {
  totalSales: SellerStatistics['totalSales'];
  totalOrders: SellerStatistics['totalOrders'];
  shopsCount: SellerStatistics['shopsCount'];
  employeesCount: SellerStatistics['employeesCount'];
  productsCount: SellerStatistics['productsCount'];
}

export interface ISellerResponse {
  sellerId: string;
  phone: Seller['phone'];
  account: string;
  telegramId: Seller['telegramId'];
  telegramUsername?: Seller['telegramUsername'];
  telegramFirstName?: Seller['telegramFirstName'];
  telegramLastName?: Seller['telegramLastName'];
  sellerLogo?: string | null;
  companyName: Seller['companyName'];
  inn: Seller['inn'];
  email: Seller['email'];
  blocked: BlockedResponseDto;
  verifiedStatus: Seller['verifiedStatus'];
  statistics: ISellerStatistics;
  lastLoginAt: Seller['lastLoginAt'];
  internalNote?: Seller['internalNote'];
  shops: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseSellerStatisticsDto implements ISellerStatistics {
  @Expose() totalSales: number;
  @Expose() totalOrders: number;
  @Expose() shopsCount: number;
  @Expose() employeesCount: number;
  @Expose() productsCount: number;
}

export class BaseSellerResponseDto implements ISellerResponse {
  @Expose() sellerId: string;
  @Expose() phone: string;
  @ExposeObjectId() account: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @ExposeObjectId() sellerLogo?: string | null;
  @Expose() companyName: string;
  @Expose() inn: string;
  @Expose() email: string;
  @Expose() @Type(() => BlockedResponseDto) blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() @Type(() => BaseSellerStatisticsDto) statistics: BaseSellerStatisticsDto;
  @Expose() lastLoginAt: Date | null;
  @Expose() internalNote?: string;
  @ExposeObjectId() shops: string[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
