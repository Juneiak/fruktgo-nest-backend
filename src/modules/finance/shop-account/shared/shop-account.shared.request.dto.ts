import { IsOptional, IsString, IsNotEmpty, IsEnum } from 'class-validator';
import {
  SettlementPeriodTransactionStatus,
  SettlementPeriodTransactionType,
  SettlementPeriodTransactionDirection
} from '../schemas/settlement-period-transaction.schema';
import { Min, IsNumber } from 'class-validator';
import { AtLeastOneOf } from 'src/common/decorators/at-least-one-of.decorator';


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