import { Expose, Type } from 'class-transformer';
import { BlockStatus } from 'src/common/enums/common.enum';
import { VerifiedStatus } from 'src/common/enums/common.enum';

export class BlockedDto {
  @Expose() status: BlockStatus;
  @Expose() reason?: string | null;
  @Expose() code?: string | null;
  @Expose() by?: string | null;
  @Expose() blockedAt?: Date | null;
  @Expose() blockedUntil?: Date | null;
}
export class AddressDto {
  @Expose() addressId: string;
  @Expose() address: string;
  @Expose() latitude?: number;
  @Expose() longitude?: number;
}
export class CustomerPreviewResponseDto {
  @Expose() customerId: string;
  @Expose() internalNote?: string | null;
  @Expose() email: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() blocked: BlockedDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
  @Expose() lastLoginAt?: Date | null;
  @Expose() lastOrderAt?: Date | null;
  @Expose() ordersCount: number;
  @Expose() totalSpent: number;
}

export class CustomerFullResponseDto {
  @Expose() customerId: string;
  @Expose() internalNote?: string | null;
  @Expose() email: string;
  @Expose() phone: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramFirstName?: string;
  @Expose() telegramLastName?: string;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
  @Expose() blocked: BlockedDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
  @Expose() @Type(() => AddressDto) savedAddresses: AddressDto[] | [];
  @Expose() @Type(() => AddressDto) selectedAddressId: AddressDto | null;
  @Expose() lastLoginAt?: Date | null;
  @Expose() lastOrderAt?: Date | null;
  @Expose() ordersCount: number;
  @Expose() totalSpent: number;
  @Expose() cart: any | null;
}
