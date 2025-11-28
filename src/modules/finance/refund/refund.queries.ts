import { RefundStatus, RefundReason } from './refund.schema';

/**
 * =====================================================
 * ЗАПРОСЫ REFUND
 * =====================================================
 */

export class GetRefundQuery {
  constructor(
    public readonly refundId: string
  ) {}
}

export class GetRefundsQuery {
  constructor(
    public readonly filter?: {
      shopAccountId?: string;
      orderId?: string;
      settlementPeriodId?: string;
      status?: RefundStatus;
      reason?: RefundReason;
      isActive?: boolean;         // CREATED или PROCESSING
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}

/**
 * Получение возврата по заказу
 */
export class GetRefundByOrderQuery {
  constructor(
    public readonly orderId: string
  ) {}
}

/**
 * Получение статистики возвратов за период
 */
export class GetRefundStatsQuery {
  constructor(
    public readonly filter: {
      shopAccountId: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}
}
