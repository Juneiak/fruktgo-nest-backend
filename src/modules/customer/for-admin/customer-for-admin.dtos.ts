import { IsString, IsNumber, IsOptional, IsEnum, IsDate, IsBoolean } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { UserSex } from 'src/common/types';
import { VerifiedStatus } from 'src/common/types';

export class AddressDto {
  @Expose()
  addressId: string;

  @Expose()
  address: string;

  @Expose()
  latitude?: number;

  @Expose()
  longitude?: number;
}


export class CustomerForAdminPreviewResponseDto {
  @Expose()
  customerId: string;

  @Expose()
  internalNote?: string | null;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername?: string;

  @Expose()
  telegramFirstName?: string;

  @Expose()
  telegramLastName?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  customerName: string;

  @Expose()
  sex?: string | null;

  @Expose()
  birthDate?: Date | null;
  
  @Expose()
  bonusPoints: number;

  @Expose()
  lastLoginAt?: Date | null;

  @Expose()
  lastOrderAt?: Date | null;

  @Expose()
  ordersCount: number;

  @Expose()
  totalSpent: number;
}

export class CustomerForAdminFullResponseDto {
  @Expose()
  customerId: string;

  @Expose()
  internalNote?: string | null;


  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  telegramId: number;

  @Expose()
  telegramUsername?: string;

  @Expose()
  telegramFirstName?: string;

  @Expose()
  telegramLastName?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  customerName: string;

  @Expose()
  sex?: string | null;

  @Expose()
  birthDate?: Date | null;
  
  @Expose()
  bonusPoints: number;

  @Expose()
  @Type(() => AddressDto)
  savedAddresses: AddressDto[] | [];

  @Expose()
  @Type(() => AddressDto)
  selectedAddressId: AddressDto | null;

  @Expose()
  lastLoginAt?: Date | null;

  @Expose()
  lastOrderAt?: Date | null;

  @Expose()
  ordersCount: number;

  @Expose()
  totalSpent: number;

  @Expose()
  cart: any | null;
}

export class UpdateCustomerByAdminDto {
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @IsEnum(VerifiedStatus)
  @IsOptional()
  verifiedStatus?: VerifiedStatus;

  @IsNumber()
  @IsOptional()
  bonusPoints?: number;

  @IsString()
  @IsOptional()
  internalNote?: string | null;
}


export class NotifyCustomerDto {

  @IsString()
  message: string;

  @IsNumber()
  telegramId: number;
}
