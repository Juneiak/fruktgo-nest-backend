import { SettlementPeriodStatus } from './schemas/settlement-period.schema';
import { SettlementPeriodTransactionType, SettlementPeriodTransactionStatus } from './schemas/settlement-period-transaction.schema';

/**
 * =====================================================
 * ЗАПРОСЫ SHOP ACCOUNT
 * =====================================================
 */

export class GetShopAccountQuery {
  constructor(
    public readonly filter: {
      shopAccountId?: string;
      shopId?: string;
    }
  ) {}
}

/**
 * =====================================================
 * ЗАПРОСЫ SETTLEMENT PERIOD
 * =====================================================
 */

export class GetSettlementPeriodQuery {
  constructor(
    public readonly settlementPeriodId: string
  ) {}
}

export class GetSettlementPeriodsQuery {
  constructor(
    public readonly filter: {
      shopId?: string;
      shopAccountId?: string;
      status?: SettlementPeriodStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}

/**
 * Получение текущего активного периода магазина
 */
export class GetCurrentPeriodQuery {
  constructor(
    public readonly shopAccountId: string
  ) {}
}

/**
 * =====================================================
 * ЗАПРОСЫ TRANSACTION
 * =====================================================
 */

export class GetTransactionQuery {
  constructor(
    public readonly transactionId: string
  ) {}
}

export class GetTransactionsQuery {
  constructor(
    public readonly filter: {
      settlementPeriodId: string;
      type?: SettlementPeriodTransactionType;
      status?: SettlementPeriodTransactionStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}
