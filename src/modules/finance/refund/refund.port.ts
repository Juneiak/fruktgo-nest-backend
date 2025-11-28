import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { Refund } from './refund.schema';
import * as Commands from './refund.commands';
import * as Queries from './refund.queries';

export const REFUND_PORT = Symbol('REFUND_PORT');

/**
 * =====================================================
 * ПОРТ REFUND (ВОЗВРАТЫ)
 * =====================================================
 * 
 * Возвраты средств клиенту за заказ или его часть.
 * 
 * Lifecycle:
 * 1. Создан (CREATED) — создана запись и транзакция
 * 2. В обработке (PROCESSING) — отправлен запрос в ЮKassa
 * 3. Завершён (COMPLETED) — деньги возвращены клиенту
 * 4. Ошибка (FAILED) — не удалось выполнить возврат
 * 5. Отменён (CANCELED) — отменён до обработки
 * 
 * При создании возврата:
 * - Создаётся транзакция ORDER_REFUND в расчётном периоде
 * - Сумма вычитается из оборота магазина
 */
export interface RefundPort {
  
  // ====================================================
  // QUERIES
  // ====================================================
  
  /**
   * Получение возврата по ID
   */
  getRefund(query: Queries.GetRefundQuery): Promise<Refund | null>;
  
  /**
   * Получение списка возвратов
   */
  getRefunds(query: Queries.GetRefundsQuery): Promise<PaginateResult<Refund>>;
  
  /**
   * Получение возврата по заказу
   */
  getRefundByOrder(query: Queries.GetRefundByOrderQuery): Promise<Refund | null>;
  
  /**
   * Получение статистики возвратов
   */
  getRefundStats(query: Queries.GetRefundStatsQuery): Promise<{
    totalCount: number;
    totalAmount: number;
    completedCount: number;
    completedAmount: number;
    pendingCount: number;
    pendingAmount: number;
  }>;
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  /**
   * Создание возврата
   * Автоматически создаёт транзакцию в расчётном периоде
   */
  createRefund(
    command: Commands.CreateRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund>;
  
  /**
   * Обработка возврата (отправка в ЮKassa)
   */
  processRefund(
    command: Commands.ProcessRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund>;
  
  /**
   * Завершение возврата
   */
  completeRefund(
    command: Commands.CompleteRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund>;
  
  /**
   * Отмена возврата
   */
  cancelRefund(
    command: Commands.CancelRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund>;
  
  /**
   * Пометка как неудавшийся
   */
  failRefund(
    command: Commands.FailRefundCommand,
    options?: CommonCommandOptions
  ): Promise<Refund>;
}
