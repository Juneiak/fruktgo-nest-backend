import { PenaltyReason, PenaltyStatus } from './penalty.schema';

/**
 * =====================================================
 * КОМАНДЫ PENALTY (ШТРАФЫ)
 * =====================================================
 * 
 * Штрафы назначаются магазину за нарушения:
 * - Задержка заказа
 * - Проблемы с качеством
 * - Несоответствие описанию
 * - Нарушение правил платформы
 * 
 * Lifecycle: CREATED → CONTESTED (опционально) → CONFIRMED/CANCELED
 */

/**
 * Создание штрафа
 * При создании автоматически создаётся транзакция PENALTY в расчётном периоде
 */
export class CreatePenaltyCommand {
  constructor(
    public readonly payload: {
      shopAccountId: string;
      amount: number;
      reason: PenaltyReason;
      description: string;
      orderId?: string;           // Если штраф связан с заказом
    }
  ) {}
}

/**
 * Оспаривание штрафа продавцом
 * Переводит штраф в статус CONTESTED
 * Доступно только в течение 7 дней с момента создания
 */
export class ContestPenaltyCommand {
  constructor(
    public readonly penaltyId: string,
    public readonly payload: {
      contestReason: string;      // Причина оспаривания
    }
  ) {}
}

/**
 * Решение по штрафу (подтверждение или отмена)
 * Вызывается админом платформы
 */
export class ResolvePenaltyCommand {
  constructor(
    public readonly penaltyId: string,
    public readonly payload: {
      status: PenaltyStatus.CONFIRMED | PenaltyStatus.CANCELED;
      adminDecision?: string;     // Ответ на оспаривание
    }
  ) {}
}

/**
 * Обновление описания штрафа (только для админа)
 */
export class UpdatePenaltyCommand {
  constructor(
    public readonly penaltyId: string,
    public readonly payload: {
      description?: string;
      amount?: number;            // Можно изменить сумму до подтверждения
    }
  ) {}
}
