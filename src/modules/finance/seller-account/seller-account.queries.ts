import { WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';

/**
 * =====================================================
 * ЗАПРОСЫ SELLER ACCOUNT
 * =====================================================
 */

export class GetSellerAccountQuery {
  constructor(
    public readonly filter: {
      sellerAccountId?: string;
      sellerId?: string;
    }
  ) {}
}

/**
 * =====================================================
 * ЗАПРОСЫ WITHDRAWAL REQUEST
 * =====================================================
 */

export class GetWithdrawalRequestQuery {
  constructor(
    public readonly withdrawalRequestId: string
  ) {}
}

export class GetWithdrawalRequestsQuery {
  constructor(
    public readonly filter?: {
      sellerId?: string;
      sellerAccountId?: string;
      status?: WithdrawalRequestStatus;
      isActive?: boolean;  // PENDING или PROCESSING
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}
