import { Type } from 'class-transformer';
import { IsOptional, IsString, IsDate, IsNotEmpty, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import {
  PlatformAccountTransactionStatus,
  PlatformAccountTransactionType,
  PlatformAccountTransactionDirection
} from '../schemas/platform-account-transaction.schema';
import { Min } from 'class-validator';


// query
export class PlatformAccountTransactionFilterQueryDto {
  @IsOptional()
  @IsEnum(PlatformAccountTransactionType)
  type?: PlatformAccountTransactionType;

  @IsOptional()
  @IsEnum(PlatformAccountTransactionStatus)
  status?: PlatformAccountTransactionStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;
}

export class CreateCorrectionDto {
  @IsEnum([PlatformAccountTransactionType.CORRECTION_IN, PlatformAccountTransactionType.CORRECTION_OUT])
  @IsNotEmpty()
  type: PlatformAccountTransactionType;

  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @IsEnum([PlatformAccountTransactionDirection.CREDIT, PlatformAccountTransactionDirection.DEBIT])
  @IsNotEmpty()
  direction: PlatformAccountTransactionDirection.CREDIT | PlatformAccountTransactionDirection.DEBIT;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  internalComment?: string;

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
