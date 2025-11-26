/**
 * Customer Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseCustomerResponseDto, [...])
 *
 * @example
 * export class CustomerResponseDto extends PickType(BaseCustomerResponseDto, [
 *   'customerId', 'customerName', 'phone'
 * ]) {}
 */

import { Expose, Type } from 'class-transformer';
import { Customer, CustomerStatistics } from 'src/modules/customer/customer.schema';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import { BlockedResponseDto, AddressResponseDto } from '../shared.response.dtos';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface ICustomerStatistics {
  ordersCount: CustomerStatistics['ordersCount'];
  totalSpent: CustomerStatistics['totalSpent'];
}

export interface ICustomerResponse {
  customerId: string;
  customerName: Customer['customerName'];
  phone?: Customer['phone'];
  email?: Customer['email'];
  telegramId: Customer['telegramId'];
  telegramUsername?: Customer['telegramUsername'];
  telegramFirstName?: Customer['telegramFirstName'];
  telegramLastName?: Customer['telegramLastName'];
  blocked: BlockedResponseDto;
  verifiedStatus: Customer['verifiedStatus'];
  sex?: Customer['sex'];
  birthDate?: Customer['birthDate'];
  statistics: ICustomerStatistics;
  bonusPoints: number; // вычисляемое
  lastLoginAt?: Customer['lastLoginAt'];
  lastOrderAt?: Customer['lastOrderAt'];
  savedAddresses: AddressResponseDto[];
  selectedAddressId: AddressResponseDto | null;
  internalNote?: Customer['internalNote'];
  cart: any | null;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseCustomerStatisticsDto implements ICustomerStatistics {
  @Expose() ordersCount: number;
  @Expose() totalSpent: number;
}

export class BaseCustomerResponseDto implements ICustomerResponse {
  @Expose() customerId: string;
  @Expose() customerName: string;
  @Expose() phone?: string;
  @Expose() email?: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() @Type(() => BlockedResponseDto) blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() sex?: UserSex;
  @Expose() birthDate?: Date;
  @Expose() @Type(() => BaseCustomerStatisticsDto) statistics: BaseCustomerStatisticsDto;
  @Expose() bonusPoints: number;
  @Expose() lastLoginAt?: Date | null;
  @Expose() lastOrderAt?: Date | null;
  @Expose() @Type(() => AddressResponseDto) savedAddresses: AddressResponseDto[];
  @Expose() @Type(() => AddressResponseDto) selectedAddressId: AddressResponseDto | null;
  @Expose() internalNote?: string;
  @Expose() cart: any | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
