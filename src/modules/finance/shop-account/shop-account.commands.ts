import { ClientSession } from 'mongoose';
import { 
  SettlementPeriodTransactionType, 
  SettlementPeriodTransactionStatus 
} from './schemas/settlement-period-transaction.schema';
import { AccountStatus } from './schemas/shop-account.schema';

/**
 * =====================================================
 * КОМАНДЫ SHOP ACCOUNT
 * =====================================================
 */

/**
 * Создание счёта магазина
 * Вызывается при создании нового магазина
 */
export class CreateShopAccountCommand {
  constructor(
    public readonly payload: {
      shopId: string;
      sellerAccountId: string;
      freezePeriodDays?: number;    // По умолчанию 14
      commissionPercent?: number;   // По умолчанию 10
    }
  ) {}
}

/**
 * Обновление настроек счёта магазина
 */
export class UpdateShopAccountCommand {
  constructor(
    public readonly shopAccountId: string,
    public readonly payload: {
      status?: AccountStatus;
      freezePeriodDays?: number;
      commissionPercent?: number;
      internalComment?: string;
    }
  ) {}
}

/**
 * =====================================================
 * КОМАНДЫ SETTLEMENT PERIOD
 * =====================================================
 */

/**
 * Открытие нового расчётного периода
 * Автоматически вызывается при создании магазина или закрытии предыдущего периода
 */
export class OpenSettlementPeriodCommand {
  constructor(
    public readonly shopAccountId: string
  ) {}
}

/**
 * Закрытие расчётного периода
 * Переводит период в статус PENDING_APPROVAL
 */
export class CloseSettlementPeriodCommand {
  constructor(
    public readonly settlementPeriodId: string
  ) {}
}

/**
 * Одобрение расчётного периода администратором
 * Переводит период в статус RELEASED и начисляет деньги на SellerAccount
 */
export class ApproveSettlementPeriodCommand {
  constructor(
    public readonly settlementPeriodId: string,
    public readonly payload?: {
      internalComment?: string;
    }
  ) {}
}

/**
 * Обновление комментария к периоду
 */
export class UpdateSettlementPeriodCommand {
  constructor(
    public readonly settlementPeriodId: string,
    public readonly payload: {
      internalComment?: string;
    }
  ) {}
}

/**
 * =====================================================
 * КОМАНДЫ TRANSACTION
 * =====================================================
 */

/**
 * Создание транзакции в расчётном периоде
 * 
 * Типы транзакций:
 * - ORDER_INCOME — доход от заказа (credit)
 * - BONUS — бонус от платформы (credit)
 * - CORRECTION_IN — корректировка в плюс (credit)
 * - PENALTY — штраф (debit)
 * - ORDER_REFUND — возврат (debit)
 * - COMMISSION — комиссия (debit)
 * - CORRECTION_OUT — корректировка в минус (debit)
 */
export class CreateTransactionCommand {
  constructor(
    public readonly payload: {
      // Один из двух обязателен
      shopAccountId?: string;
      settlementPeriodId?: string;
      
      // Обязательные поля
      type: SettlementPeriodTransactionType;
      amount: number;
      description: string;
      
      // Опциональные
      status?: SettlementPeriodTransactionStatus;
      internalComment?: string;
      externalTransactionId?: string;
      
      // Ссылки на связанные сущности
      references?: {
        orderId?: string;
        paymentId?: string;
        refundId?: string;
        penaltyId?: string;
        bonusId?: string;
      };
    }
  ) {}
}

/**
 * Обновление статуса транзакции
 */
export class UpdateTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly payload: {
      status?: SettlementPeriodTransactionStatus;
      description?: string;
      internalComment?: string;
    }
  ) {}
}

/**
 * Отмена транзакции
 */
export class CancelTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly reason?: string
  ) {}
}
