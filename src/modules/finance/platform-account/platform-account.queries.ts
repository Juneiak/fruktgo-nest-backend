import { 
  PlatformAccountTransactionType, 
  PlatformAccountTransactionStatus 
} from './schemas/platform-account-transaction.schema';

/**
 * =====================================================
 * ЗАПРОСЫ PLATFORM ACCOUNT
 * =====================================================
 */

/**
 * Получение счёта платформы (единственный)
 */
export class GetPlatformAccountQuery {
  constructor() {}
}

/**
 * =====================================================
 * ЗАПРОСЫ TRANSACTION
 * =====================================================
 */

export class GetPlatformTransactionQuery {
  constructor(
    public readonly transactionId: string
  ) {}
}

export class GetPlatformTransactionsQuery {
  constructor(
    public readonly filter?: {
      type?: PlatformAccountTransactionType;
      status?: PlatformAccountTransactionStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly pagination?: {
      page?: number;
      pageSize?: number;
    }
  ) {}
}
