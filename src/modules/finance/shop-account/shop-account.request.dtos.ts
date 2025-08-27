import { Expose, Type } from 'class-transformer';
import { IsOptional, IsString, IsDate, IsNotEmpty, IsEnum, Max } from 'class-validator';
import { SettlementPeriodAmounts, SettlementPeriodStatus } from './schemas/settlement-period.schema';
import { SettlementPeriodTransactionStatus, SettlementPeriodTransactionType, SettlementPeriodTransactionDirection } from './schemas/settlement-period-transaction.schema';
import { Min, IsNumber } from 'class-validator';
import { AccountStatus } from './schemas/shop-account.schema';
import { AtLeastOneOf } from 'src/common/decorators/at-least-one-of.decorator';

// ====================================================
// PUBLIC
// ====================================================
export class CreateSettlementPeriodTransactionDto {
  @IsOptional()
  @IsString()
  shopAccountId?: string;

  @IsOptional()
  @IsString()
  settlementPeriodId?: string;

  @AtLeastOneOf(['shopAccountId', 'settlementPeriodId'], {
    message: 'Должен быть указан хотя бы один идентификатор: shopAccountId или settlementPeriodId',
  })
  readonly _atLeastOneOf?: any;

  @IsNotEmpty()
  @IsEnum(SettlementPeriodTransactionType)
  type: SettlementPeriodTransactionType;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsEnum(SettlementPeriodTransactionDirection)
  direction: SettlementPeriodTransactionDirection;

  @IsOptional()
  @IsString()
  internalComment?: string;

  @IsOptional()
  @IsEnum(SettlementPeriodTransactionStatus)
  status?: SettlementPeriodTransactionStatus;

  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @IsOptional()
  @IsString()
  referenceOrderId?: string;

  @IsOptional()
  @IsString()
  referencePenaltyId?: string;

  @IsOptional()
  @IsString()
  referencePaymentId?: string;

  @IsOptional()
  @IsString()
  referenceRefundId?: string;

  @IsOptional()
  @IsString()
  referenceBonusId?: string;

  @IsOptional()
  @IsString()
  referencePayoutId?: string;

  @IsOptional()
  @IsString()
  referenceDeliveryPaymentId?: string;

  @IsOptional()
  @IsString()
  referenceSettlementPeriodTransactionId?: string;
}


export class UpdateSettlementPeriodTransactionDto {
  @IsOptional()
  @IsEnum(SettlementPeriodTransactionStatus)
  status?: SettlementPeriodTransactionStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalComment?: string;

  @IsOptional()
  @IsString()
  referenceOrderId?: string;

  @IsOptional()
  @IsString()
  referencePenaltyId?: string;

  @IsOptional()
  @IsString()
  referencePaymentId?: string;

  @IsOptional()
  @IsString()
  referenceRefundId?: string;

  @IsOptional()
  @IsString()
  referenceBonusId?: string;

  @IsOptional()
  @IsString()
  referencePayoutId?: string;

  @IsOptional()
  @IsString()
  referenceDeliveryPaymentId?: string;

  @IsOptional()
  @IsString()
  referenceSettlementPeriodTransactionId?: string;
}


// query
export class SettlementPeriodTransactionFilterQueryDto {
  @IsOptional()
  @IsEnum(SettlementPeriodTransactionType)
  type?: SettlementPeriodTransactionType;

  @IsOptional()
  @IsEnum(SettlementPeriodTransactionStatus)
  status?: SettlementPeriodTransactionStatus;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;
}


// query
export class SettlementPeriodFilterQueryDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;
}



// ====================================================
// FOR ADMIN
// ====================================================


export class UpdateShopAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsNumber()
  freezePeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}


export class ApproveSettlementPeriodDto {
  @IsOptional()
  @IsString()
  comment?: string;
}


export class CreateCorrectionDto {
  @IsNotEmpty()
  @IsEnum([SettlementPeriodTransactionType.CORRECTION_IN, SettlementPeriodTransactionType.CORRECTION_OUT])
  type: SettlementPeriodTransactionType.CORRECTION_IN | SettlementPeriodTransactionType.CORRECTION_OUT;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsEnum([SettlementPeriodTransactionDirection.CREDIT, SettlementPeriodTransactionDirection.DEBIT])
  direction: SettlementPeriodTransactionDirection.CREDIT | SettlementPeriodTransactionDirection.DEBIT;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  internalComment?: string;

  @IsOptional()
  @IsString()
  referenceOrderId?: string;

  @IsOptional()
  @IsString()
  referencePenaltyId?: string;

  @IsOptional()
  @IsString()
  referencePaymentId?: string;

  @IsOptional()
  @IsString()
  referenceRefundId?: string;

  @IsOptional()
  @IsString()
  referenceBonusId?: string;

  @IsOptional()
  @IsString()
  referencePayoutId?: string;

  @IsOptional()
  @IsString()
  referenceDeliveryPaymentId?: string;

  @IsOptional()
  @IsString()
  referenceSettlementPeriodTransactionId?: string;
}



// ====================================================
// FOR SELLER
// ====================================================
