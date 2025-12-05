import { MixedBatch } from '../../batch/mixed-batch.schema';
import {
  ConsolidationResult,
  MixedBatchComposition,
  ConsolidationCandidate,
} from './consolidation.types';
import * as Commands from './consolidation.commands';
import * as Queries from './consolidation.queries';

/**
 * Статистика консолидаций
 */
export interface ConsolidationStatistics {
  totalConsolidations: number;
  totalBatchesConsolidated: number;
  totalQuantityConsolidated: number;
  byReason: Record<string, number>;
}

/**
 * Порт модуля Consolidation
 */
export interface ConsolidationPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Автоконсолидация мелких остатков
   */
  autoConsolidate(
    command: Commands.AutoConsolidateCommand,
  ): Promise<ConsolidationResult | null>;

  /**
   * Консолидация при инвентаризации
   */
  consolidateAtAudit(
    command: Commands.ConsolidateAtAuditCommand,
  ): Promise<ConsolidationResult>;

  /**
   * Ручная консолидация
   */
  manualConsolidate(
    command: Commands.ManualConsolidateCommand,
  ): Promise<ConsolidationResult>;

  /**
   * Автоконсолидация всей локации
   */
  autoConsolidateLocation(
    command: Commands.AutoConsolidateLocationCommand,
  ): Promise<ConsolidationResult[]>;

  /**
   * Автоконсолидация для всего продавца
   */
  autoConsolidateSeller(
    command: Commands.AutoConsolidateSellerCommand,
  ): Promise<ConsolidationResult[]>;

  /**
   * Деактивировать MixedBatch
   */
  deactivateMixedBatch(
    command: Commands.DeactivateMixedBatchCommand,
  ): Promise<MixedBatch>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Получить MixedBatch по ID
   */
  getById(query: Queries.GetMixedBatchByIdQuery): Promise<MixedBatch | null>;

  /**
   * Получить состав MixedBatch
   */
  getComposition(
    query: Queries.GetMixedBatchCompositionQuery,
  ): Promise<MixedBatchComposition | null>;

  /**
   * Получить MixedBatch в локации
   */
  getMixedBatches(
    query: Queries.GetMixedBatchesQuery,
  ): Promise<{ items: MixedBatch[]; total: number }>;

  /**
   * Найти кандидатов на консолидацию
   */
  findCandidates(
    query: Queries.FindConsolidationCandidatesQuery,
  ): Promise<ConsolidationCandidate[]>;

  /**
   * Найти MixedBatch по компоненту (трассировка)
   */
  getByComponent(
    query: Queries.GetMixedBatchesByComponentQuery,
  ): Promise<MixedBatch[]>;

  /**
   * История консолидаций
   */
  getHistory(
    query: Queries.GetConsolidationHistoryQuery,
  ): Promise<{ items: MixedBatch[]; total: number }>;

  /**
   * Статистика
   */
  getStatistics(
    query: Queries.GetConsolidationStatisticsQuery,
  ): Promise<ConsolidationStatistics>;
}

export const CONSOLIDATION_PORT = Symbol('CONSOLIDATION_PORT');
