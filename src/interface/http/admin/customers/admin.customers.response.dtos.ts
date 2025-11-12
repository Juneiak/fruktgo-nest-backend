import { Expose, Type } from 'class-transformer'
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { BlockedResponseDto, AddressResponseDto } from 'src/interface/http/common/common.response.dtos';


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
  @Expose() blocked: BlockedResponseDto;
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
  @Expose() blocked: BlockedResponseDto;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() sex?: string | null;
  @Expose() birthDate?: Date | null;
  @Expose() bonusPoints: number;
  @Expose() @Type(() => AddressResponseDto) savedAddresses: AddressResponseDto[] | [];
  @Expose() @Type(() => AddressResponseDto) selectedAddressId: AddressResponseDto | null;
  @Expose() lastLoginAt?: Date | null;
  @Expose() lastOrderAt?: Date | null;
  @Expose() ordersCount: number;
  @Expose() totalSpent: number;
  @Expose() cart: any | null;
}
