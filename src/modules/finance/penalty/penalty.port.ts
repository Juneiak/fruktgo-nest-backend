import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { Penalty } from './penalty.schema';
import * as Commands from './penalty.commands';
import * as Queries from './penalty.queries';

export const PENALTY_PORT = Symbol('PENALTY_PORT');

/**
 * =====================================================
 * ПОРТ PENALTY (ШТРАФЫ)
 * =====================================================
 * 
 * Штрафы назначаются магазину за нарушения.
 * При создании штрафа создаётся транзакция в расчётном периоде.
 * Продавец может оспорить штраф в течение 7 дней.
 * 
 * Lifecycle:
 * 1. Создан (CREATED) — транзакция со статусом PENDING
 * 2. Оспаривается (CONTESTED) — продавец подал апелляцию
 * 3. Подтверждён (CONFIRMED) — транзакция COMPLETED, списывается из периода
 * 4. Отменён (CANCELED) — транзакция CANCELED, не списывается
 */
export interface PenaltyPort {
  
  // ====================================================
  // QUERIES
  // ====================================================
  
  /**
   * Получение штрафа по ID
   */
  getPenalty(query: Queries.GetPenaltyQuery): Promise<Penalty | null>;
  
  /**
   * Получение списка штрафов
   */
  getPenalties(query: Queries.GetPenaltiesQuery): Promise<PaginateResult<Penalty>>;
  
  /**
   * Получение статистики штрафов
   */
  getPenaltyStats(query: Queries.GetPenaltyStatsQuery): Promise<{
    totalCount: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    contestedCount: number;
    canceledCount: number;
  }>;
  
  // ====================================================
  // COMMANDS
  // ====================================================
  
  /**
   * Создание штрафа
   * Автоматически создаёт транзакцию в расчётном периоде
   */
  createPenalty(
    command: Commands.CreatePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty>;
  
  /**
   * Оспаривание штрафа продавцом
   */
  contestPenalty(
    command: Commands.ContestPenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty>;
  
  /**
   * Решение по штрафу (подтверждение/отмена)
   */
  resolvePenalty(
    command: Commands.ResolvePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty>;
  
  /**
   * Обновление штрафа
   */
  updatePenalty(
    command: Commands.UpdatePenaltyCommand,
    options?: CommonCommandOptions
  ): Promise<Penalty>;
}
