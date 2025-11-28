import { SellerAccountStatus } from './schemas/seller-account.schema';
import { WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';

/**
 * =====================================================
 * КОМАНДЫ SELLER ACCOUNT
 * =====================================================
 */

/**
 * Создание счёта продавца
 * Вызывается при регистрации нового продавца
 */
export class CreateSellerAccountCommand {
  constructor(
    public readonly sellerId: string
  ) {}
}

/**
 * Обновление банковских реквизитов
 */
export class UpdateBankDetailsCommand {
  constructor(
    public readonly sellerAccountId: string,
    public readonly payload: {
      accountNumber?: string;
      bankName?: string;
      bik?: string;
      correspondentAccount?: string;
      accountHolder?: string;
      inn?: string;
    }
  ) {}
}

/**
 * Обновление статуса счёта продавца
 */
export class UpdateSellerAccountStatusCommand {
  constructor(
    public readonly sellerAccountId: string,
    public readonly payload: {
      status: SellerAccountStatus;
      statusReason?: string;
    }
  ) {}
}

/**
 * Пополнение баланса продавца
 * Вызывается при одобрении расчётного периода магазина
 */
export class AddFundsCommand {
  constructor(
    public readonly sellerAccountId: string,
    public readonly payload: {
      amount: number;
      settlementPeriodId: string;
    }
  ) {}
}

/**
 * =====================================================
 * КОМАНДЫ WITHDRAWAL REQUEST
 * =====================================================
 */

/**
 * Создание заявки на вывод средств
 */
export class CreateWithdrawalRequestCommand {
  constructor(
    public readonly sellerId: string,
    public readonly payload: {
      amount: number;
    }
  ) {}
}

/**
 * Обновление статуса заявки на вывод
 */
export class UpdateWithdrawalRequestCommand {
  constructor(
    public readonly withdrawalRequestId: string,
    public readonly payload: {
      status: WithdrawalRequestStatus;
      adminComment?: string;
      externalTransactionId?: string;
    }
  ) {}
}

/**
 * Одобрение заявки на вывод (обработка платежа)
 * Списывает сумму с баланса продавца
 */
export class ApproveWithdrawalCommand {
  constructor(
    public readonly withdrawalRequestId: string,
    public readonly payload?: {
      adminComment?: string;
      externalTransactionId?: string;
    }
  ) {}
}

/**
 * Отклонение заявки на вывод
 * Возвращает сумму на баланс продавца (если была списана)
 */
export class RejectWithdrawalCommand {
  constructor(
    public readonly withdrawalRequestId: string,
    public readonly reason: string
  ) {}
}
