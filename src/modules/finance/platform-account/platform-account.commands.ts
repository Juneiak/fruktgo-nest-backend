import { 
  PlatformAccountTransactionType, 
  PlatformAccountTransactionStatus 
} from './schemas/platform-account-transaction.schema';

/**
 * =====================================================
 * КОМАНДЫ PLATFORM ACCOUNT TRANSACTION
 * =====================================================
 * 
 * PlatformAccount — единственный счёт платформы,
 * содержащий агрегаты всех финансовых показателей.
 * 
 * Все изменения происходят через транзакции.
 */

/**
 * Создание транзакции на счёте платформы
 */
export class CreatePlatformTransactionCommand {
  constructor(
    public readonly payload: {
      type: PlatformAccountTransactionType;
      amount: number;
      description?: string;
      status?: PlatformAccountTransactionStatus;
      isManual?: boolean;
      internalComment?: string;
      externalTransactionId?: string;
      
      // Ссылки на связанные сущности
      references?: {
        orderId?: string;
        customerId?: string;
        employeeId?: string;
        sellerAccountId?: string;
        shopAccountId?: string;
        paymentId?: string;
        refundId?: string;
        penaltyId?: string;
        withdrawalRequestId?: string;
        deliveryPaymentId?: string;
        externalServiceId?: string;
      };
    }
  ) {}
}

/**
 * Обновление транзакции
 */
export class UpdatePlatformTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly payload: {
      status?: PlatformAccountTransactionStatus;
      description?: string;
      internalComment?: string;
    }
  ) {}
}

/**
 * Пересчёт агрегатов PlatformAccount
 * Вызывается периодически или после крупных операций
 */
export class RecalculatePlatformAccountCommand {
  constructor() {}
}
