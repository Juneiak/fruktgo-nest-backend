import { Audit } from './audit.schema';
import * as Commands from './audit.commands';
import * as Queries from './audit.queries';
import { AuditStatus } from './audit.enums';

/**
 * Результат применения корректировок
 */
export interface ApplyCorrectionsResult {
  audit: Audit;
  /** Позиции с излишком (созданы корректировки +) */
  surplusAdjustments: Array<{
    itemIndex: number;
    batchLocationId: string;
    adjustment: number;
  }>;
  /** Позиции с недостачей (созданы корректировки -) */
  shortageAdjustments: Array<{
    itemIndex: number;
    batchLocationId: string;
    adjustment: number;
  }>;
}

/**
 * Статистика инвентаризаций
 */
export interface AuditStatistics {
  totalAudits: number;
  completedAudits: number;
  totalDiscrepancies: number;
  totalSurplus: number;
  totalShortage: number;
  byStatus: Array<{
    status: AuditStatus;
    count: number;
  }>;
  averageDiscrepancyRate: number;
}

/**
 * Порт модуля Audit
 */
export interface AuditPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать инвентаризацию */
  create(command: Commands.CreateAuditCommand): Promise<Audit>;

  /** Начать инвентаризацию */
  start(command: Commands.StartAuditCommand): Promise<Audit>;

  /** Ввести количество для позиции */
  countItem(command: Commands.CountAuditItemCommand): Promise<Audit>;

  /** Массовый ввод количеств */
  bulkCountItems(command: Commands.BulkCountAuditItemsCommand): Promise<Audit>;

  /** Пропустить позицию */
  skipItem(command: Commands.SkipAuditItemCommand): Promise<Audit>;

  /** Завершить инвентаризацию */
  complete(command: Commands.CompleteAuditCommand): Promise<Audit>;

  /** Применить корректировки */
  applyCorrections(
    command: Commands.ApplyAuditCorrectionsCommand,
  ): Promise<ApplyCorrectionsResult>;

  /** Отменить */
  cancel(command: Commands.CancelAuditCommand): Promise<Audit>;

  /** Добавить фото */
  addItemPhotos(command: Commands.AddAuditItemPhotosCommand): Promise<Audit>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetAuditByIdQuery): Promise<Audit | null>;

  /** Получить по номеру документа */
  getByDocumentNumber(
    query: Queries.GetAuditByDocumentNumberQuery,
  ): Promise<Audit | null>;

  /** Получить по продавцу */
  getBySeller(
    query: Queries.GetAuditsBySellerQuery,
  ): Promise<{ items: Audit[]; total: number }>;

  /** Получить для локации */
  getForLocation(
    query: Queries.GetAuditsForLocationQuery,
  ): Promise<{ items: Audit[]; total: number }>;

  /** Получить активные */
  getActive(query: Queries.GetActiveAuditsQuery): Promise<Audit[]>;

  /** Получить статистику */
  getStatistics(query: Queries.GetAuditStatisticsQuery): Promise<AuditStatistics>;

  /** Получить историю по продукту */
  getProductHistory(
    query: Queries.GetProductAuditHistoryQuery,
  ): Promise<Audit[]>;

  /** Поиск */
  search(
    query: Queries.SearchAuditsQuery,
  ): Promise<{ items: Audit[]; total: number }>;

  /** Сгенерировать номер документа */
  generateDocumentNumber(sellerId: string): Promise<string>;
}

export const AUDIT_PORT = Symbol('AUDIT_PORT');
