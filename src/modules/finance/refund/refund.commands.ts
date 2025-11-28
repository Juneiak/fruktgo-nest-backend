import { RefundReason, RefundStatus } from './refund.schema';

/**
 * =====================================================
 * КОМАНДЫ REFUND (ВОЗВРАТЫ)
 * =====================================================
 * 
 * Возвраты средств клиенту.
 * 
 * Типы возвратов:
 * - По запросу клиента
 * - Проблема с качеством
 * - Проблема с доставкой
 * - Ошибка в заказе (недовес, пересорт)
 * - Товар закончился
 * 
 * Lifecycle: CREATED → PROCESSING → COMPLETED/FAILED/CANCELED
 * 
 * При создании:
 * 1. Создаётся запись Refund
 * 2. Создаётся транзакция ORDER_REFUND в расчётном периоде
 * 3. Инициируется возврат через ЮKassa (если оплачено онлайн)
 */

/**
 * Создание возврата
 */
export class CreateRefundCommand {
  constructor(
    public readonly payload: {
      shopAccountId: string;
      orderId: string;
      amount: number;
      reason: RefundReason;
      description?: string;
      initiatedBy: {
        type: 'customer' | 'seller' | 'admin';
        id: string;
      };
    }
  ) {}
}

/**
 * Обработка возврата (отправка в ЮKassa)
 */
export class ProcessRefundCommand {
  constructor(
    public readonly refundId: string
  ) {}
}

/**
 * Подтверждение возврата (после получения webhook от ЮKassa)
 */
export class CompleteRefundCommand {
  constructor(
    public readonly refundId: string,
    public readonly payload: {
      yookassaRefundId: string;   // ID возврата в ЮKassa
    }
  ) {}
}

/**
 * Отмена возврата
 */
export class CancelRefundCommand {
  constructor(
    public readonly refundId: string,
    public readonly reason?: string
  ) {}
}

/**
 * Пометка возврата как неудавшегося
 */
export class FailRefundCommand {
  constructor(
    public readonly refundId: string,
    public readonly reason: string
  ) {}
}
