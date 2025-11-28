import { PenaltyStatus, PenaltyReason } from './penalty.schema';

/**
 * =====================================================
 * ЗАПРОСЫ PENALTY
 * =====================================================
 */

export class GetPenaltyQuery {
  constructor(
    public readonly penaltyId: string
  ) {}
}

export class GetPenaltiesQuery {
  constructor(
    public readonly filter?: {
      shopAccountId?: string;
      settlementPeriodId?: string;
      status?: PenaltyStatus;
      reason?: PenaltyReason;
      isActive?: boolean;         // CREATED или CONTESTED
      orderId?: string;
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}

/**
 * Получение статистики штрафов за период
 */
export class GetPenaltyStatsQuery {
  constructor(
    public readonly filter: {
      shopAccountId: string;
      fromDate?: Date;
      toDate?: Date;
    }
  ) {}
}
