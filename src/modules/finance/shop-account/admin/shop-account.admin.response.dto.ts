import { Expose, Type } from 'class-transformer';
import { SettlementPeriodAmounts, SettlementPeriodStatus } from '../schemas/settlement-period.schema';
import {
  SettlementPeriodTransactionStatus,
  SettlementPeriodTransactionType,
  SettlementPeriodTransactionDirection
} from '../schemas/settlement-period-transaction.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { Types } from 'mongoose';
import { AccountStatus } from '../schemas/shop-account.schema';

// ====================================================
// SHOP ACCOUNT
// ====================================================
export class ShopAccountResponseDto {
  @Expose() shopAccountId: string;
  @ExposeObjectId() shop: Types.ObjectId | null;
  @ExposeObjectId() sellerAccount: Types.ObjectId | null;
  @ExposeObjectId() currentSettlementPeriod: Types.ObjectId | null;
  @Expose() lifetimeEarnings: number;
  @Expose() totalPenalties: number;
  @Expose() totalCommissions: number;
  @Expose() status: AccountStatus;
  @Expose() freezePeriodDays: number;
}


// ====================================================
// SETTLEMENT PERIOD
// ====================================================
export class SettlementPeriodResponseDto {
  @Expose() settlementPeriodId: string;
  @ExposeObjectId() shopAccount: string;
  @Expose() periodNumber: number;
  @Expose() startDate: Date;
  @Expose() endDate: Date;
  @Expose() releaseDate: Date;
  @Expose() status: SettlementPeriodStatus;
  @Expose() amounts: SettlementPeriodAmounts;
  @Expose() totalAmount: number;
  @Expose() releasedAmount: number;
  @Expose() comment: string;
  @Expose() periodDurationDays: number;
  @Expose() createdAt: Date;
}

export class ReferenceDto {
  @Expose() orderId?: string;
  @Expose() payoutRequestId?: string;
  @Expose() paymentId?: string;
  @Expose() refundId?: string;
  @Expose() correctionId?: string;
  @Expose() penaltyId?: string;
  @Expose() commissionId?: string;
  @Expose() bonusId?: string;
  @Expose() payoutId?: string;
  @Expose() deliveryPaymentId?: string;
  @Expose() settlementPeriodTransactionId?: string;
}
export class SettlementPeriodTransactionResponseDto {
  @Expose() shopTransactionId: string;
  @Expose() createdAt: Date;
  @ExposeObjectId() shopAccount: string;
  @ExposeObjectId() settlementPeriod: string;
  @Expose() type: SettlementPeriodTransactionType;
  @Expose() status: SettlementPeriodTransactionStatus;
  @Expose() direction: SettlementPeriodTransactionDirection;
  @Expose() amount: number;
  @Expose() description: string | null;
  @Expose() internalComment?: string;
  @Expose() @Type(() => ReferenceDto) references: ReferenceDto;
  @Expose() externalTransactionId: string;
}
