import { IsOptional, IsString, IsNotEmpty, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import {
  PlatformAccountTransactionStatus,
  PlatformAccountTransactionType,
  PlatformAccountTransactionDirection
} from '../schemas/platform-account-transaction.schema';
import { Min } from 'class-validator';


export class CreatePlatformAccountTransactionDto {
  @IsEnum([PlatformAccountTransactionType.CORRECTION_IN, PlatformAccountTransactionType.CORRECTION_OUT])
  @IsNotEmpty()
  type: PlatformAccountTransactionType;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @IsEnum([PlatformAccountTransactionDirection.CREDIT, PlatformAccountTransactionDirection.DEBIT])
  @IsNotEmpty()
  direction: PlatformAccountTransactionDirection;

  @IsEnum([PlatformAccountTransactionStatus.PENDING, PlatformAccountTransactionStatus.COMPLETED, PlatformAccountTransactionStatus.FAILED, PlatformAccountTransactionStatus.CANCELED])
  @IsOptional()
  status?: PlatformAccountTransactionStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  internalComment?: string;

  @IsBoolean()
  @IsOptional()
  isManual?: boolean;

  @IsString()
  @IsOptional()
  externalTransactionId?: string;

  @IsString()
  @IsOptional()
  referenceOrderId?: string;

  @IsString()
  @IsOptional()
  referenceCustomerId?: string;

  @IsString()
  @IsOptional()
  referenceEmployeeId?: string;

  @IsString()
  @IsOptional()
  referenceSellerAccountId?: string;

  @IsString()
  @IsOptional()
  referenceShopAccountId?: string;

  @IsString()
  @IsOptional()
  referencePaymentId?: string;

  @IsString()
  @IsOptional()
  referenceRefundId?: string;

  @IsString()
  @IsOptional()
  referencePenaltyId?: string;

  @IsString()
  @IsOptional()
  referenceWithdrawalRequestId?: string;

  @IsString()
  @IsOptional()
  referenceDeliveryPaymentId?: string;

  @IsString()
  @IsOptional()
  referenceExternalServiceId?: string

  @IsString()
  @IsOptional()
  referencePlatformAccountTransactionId?: string;
}


export class UpdatePlatformAccountTransactionDto {
  @IsEnum([PlatformAccountTransactionStatus.PENDING, PlatformAccountTransactionStatus.COMPLETED, PlatformAccountTransactionStatus.FAILED, PlatformAccountTransactionStatus.CANCELED])
  @IsOptional()
  status?: PlatformAccountTransactionStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  internalComment?: string;

  @IsString()
  @IsOptional()
  externalTransactionId?: string;

  @IsString()
  @IsOptional()
  referenceOrderId?: string;

  @IsString()
  @IsOptional()
  referenceCustomerId?: string;

  @IsString()
  @IsOptional()
  referenceEmployeeId?: string;

  @IsString()
  @IsOptional()
  referenceSellerAccountId?: string;

  @IsString()
  @IsOptional()
  referenceShopAccountId?: string;

  @IsString()
  @IsOptional()
  referencePaymentId?: string;

  @IsString()
  @IsOptional()
  referenceRefundId?: string;

  @IsString()
  @IsOptional()
  referencePenaltyId?: string;

  @IsString()
  @IsOptional()
  referenceWithdrawalRequestId?: string;

  @IsString()
  @IsOptional()
  referenceDeliveryPaymentId?: string;

  @IsString()
  @IsOptional()
  referenceExternalServiceId?: string

  @IsString()
  @IsOptional()
  referencePlatformAccountTransactionId?: string;
}
