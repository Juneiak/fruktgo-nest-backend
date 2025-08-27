import { Expose, Type } from 'class-transformer';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { Types } from 'mongoose';
import { PlatformAccountTransactionDirection, PlatformAccountTransactionStatus, PlatformAccountTransactionType } from './schemas/platform-account-transaction.schema';

// ====================================================
// PLATFORM ACCOUNT
// ====================================================
export class PlatformAccountResponseDto {
  @Expose()
  platformAccountId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  totalInflow: number;

  @Expose()
  totalOutflow: number;

  @Expose()
  currentBalance: number;

  @Expose()
  frozenSellersFunds: number;

  @Expose()
  availableSellersFunds: number;

  @Expose()
  inActiveSettlementPeriods: number;

  @Expose()
  platformEarnings: number;

  @Expose()
  totalPlatformCommissions: number;

  @Expose()
  totalPenaltyIncome: number;

  @Expose()
  frozenDeliveryFunds: number;

  @Expose()
  deliveryPayouts: number;

  @Expose()
  totalPayoutsToSellers: number;

  @Expose()
  totalRefundsToCustomers: number;

  @Expose()
  totalBonusesIssued: number;

  @Expose()
  totalExternalIncome: number;

  @Expose()
  reserveFunds: number;

  @Expose()
  totalWithheldTaxes: number;

  @Expose()
  totalBankFees: number;
}



// ====================================================
// PLATFORM ACCOUNT TRANSACTION
// ====================================================
class ReferenceDto {
  @Expose()
  orderId?: string;
  @Expose()
  customerId?: string;
  @Expose()
  employeeId?: string;
  @Expose()
  sellerAccountId?: string;
  @Expose()
  shopAccountId?: string;
  @Expose()
  paymentId?: string;
  @Expose()
  refundId?: string;
  @Expose()
  penaltyId?: string;
  @Expose()
  withdrawalRequestId?: string;
  @Expose()
  deliveryPaymentId?: string;
  @Expose()
  externalServiceId?: string;
  @Expose()
  platformAccountTransactionId?: string;
}
export class PlatformAccountTransactionResponseDto {
  @Expose()
  platformAccountTransactionId: string;
  
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @ExposeObjectId()
  platformAccount: Types.ObjectId;

  @Expose()
  type: PlatformAccountTransactionType;

  @Expose()
  status: PlatformAccountTransactionStatus;

  @Expose()
  direction: PlatformAccountTransactionDirection;

  @Expose()
  amount: number;

  @Expose()
  description?: string | null;

  @Expose()
  internalComment?: string;

  @Expose()
  isManual: boolean;

  @Expose()
  @Type(() => ReferenceDto)
  references: ReferenceDto;

  @Expose()
  externalTransactionId?: string | null;
}
