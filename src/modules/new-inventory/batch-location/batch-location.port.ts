import { BatchLocation } from './batch-location.schema';
import * as Commands from './batch-location.commands';
import * as Queries from './batch-location.queries';

/**
 * Результат FEFO-операции
 */
export interface FefoConsumeResult {
  /** Общее списанное количество */
  totalConsumed: number;
  /** Детали по партиям */
  consumedFromBatches: Array<{
    batchLocationId: string;
    batchId: string;
    quantity: number;
    remainingQuantity: number;
  }>;
  /** Всё ли количество было списано */
  fullyConsumed: boolean;
  /** Недостающее количество (если не хватило) */
  shortfall?: number;
}

/**
 * Результат резервирования
 */
export interface ReserveResult {
  /** Успешно зарезервировано */
  success: boolean;
  /** Зарезервированное количество */
  reservedQuantity: number;
  /** Детали по партиям */
  reservedFromBatches: Array<{
    batchLocationId: string;
    batchId: string;
    quantity: number;
  }>;
  /** Недостающее количество */
  shortfall?: number;
}

/**
 * Агрегированный остаток
 */
export interface AggregatedStock {
  /** ID товара */
  productId: string;
  /** Общий остаток */
  totalQuantity: number;
  /** Зарезервировано */
  totalReserved: number;
  /** Доступно */
  availableQuantity: number;
  /** Количество партий */
  batchCount: number;
  /** Ближайший срок годности */
  nearestExpirationDate?: Date;
  /** Средняя свежесть */
  averageFreshness: number;
  /** Средняя закупочная цена */
  averagePurchasePrice?: number;
}

/**
 * Статистика локации
 */
export interface LocationStockStatistics {
  /** Общее количество SKU */
  totalProducts: number;
  /** Общее количество партий */
  totalBatches: number;
  /** Общий остаток (единиц) */
  totalQuantity: number;
  /** Всего зарезервировано */
  totalReserved: number;
  /** Общая стоимость (по закупке) */
  totalValue: number;
  /** Партий с истекающим сроком (< 7 дней) */
  expiringBatches: number;
  /** Товаров с низким остатком */
  lowStockProducts: number;
}

/**
 * Проверка доступности
 */
export interface AvailabilityCheck {
  isAvailable: boolean;
  requestedQuantity: number;
  availableQuantity: number;
  shortfall: number;
}

/**
 * Порт модуля BatchLocation
 */
export interface BatchLocationPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать запись остатка */
  create(command: Commands.CreateBatchLocationCommand): Promise<BatchLocation>;

  /** Изменить количество */
  changeQuantity(command: Commands.ChangeQuantityCommand): Promise<BatchLocation>;

  /** Списать по FEFO */
  consumeByFefo(command: Commands.ConsumeByFefoCommand): Promise<FefoConsumeResult>;

  /** Зарезервировать по FEFO */
  reserveByFefo(command: Commands.ReserveByFefoCommand): Promise<ReserveResult>;

  /** Снять резерв */
  releaseReservation(command: Commands.ReleaseReservationCommand): Promise<void>;

  /** Принудительно снять резерв */
  forceReleaseReservation(
    command: Commands.ForceReleaseReservationCommand,
  ): Promise<number>;

  /** Синхронизировать с партией */
  syncFromBatch(command: Commands.SyncFromBatchCommand): Promise<void>;

  /** Перенести в другую локацию */
  transferToLocation(
    command: Commands.TransferToLocationCommand,
  ): Promise<{ source: BatchLocation; target: BatchLocation }>;

  /** Применить усушку */
  applyShrinkage(command: Commands.ApplyShrinkageCommand): Promise<BatchLocation>;

  /** Пометить израсходованным */
  markDepleted(command: Commands.MarkDepletedCommand): Promise<BatchLocation>;

  /** Зарезервировать количество */
  reserve(command: Commands.ReserveQuantityCommand): Promise<BatchLocation>;

  /** Снять резерв (освободить) */
  releaseReserve(command: Commands.ReleaseReserveCommand): Promise<BatchLocation>;

  /** Подтвердить резерв (списать) */
  confirmReserve(command: Commands.ConfirmReserveCommand): Promise<BatchLocation>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetBatchLocationByIdQuery): Promise<BatchLocation | null>;

  /** Получить по партии */
  getByBatch(query: Queries.GetByBatchQuery): Promise<BatchLocation[]>;

  /** Получить партию в локации */
  getBatchInLocation(
    query: Queries.GetBatchInLocationQuery,
  ): Promise<BatchLocation | null>;

  /** Получить остатки товара в локации (FEFO) */
  getProductStockInLocation(
    query: Queries.GetProductStockInLocationQuery,
  ): Promise<BatchLocation[]>;

  /** Получить агрегированный остаток */
  getAggregatedStock(
    query: Queries.GetAggregatedStockQuery,
  ): Promise<AggregatedStock[]>;

  /** Получить все остатки в локации */
  getAllStockInLocation(
    query: Queries.GetAllStockInLocationQuery,
  ): Promise<{ items: BatchLocation[]; total: number }>;

  /** Получить зарезервированное по заказу */
  getReservedByOrder(
    query: Queries.GetReservedByOrderQuery,
  ): Promise<BatchLocation[]>;

  /** Проверить доступность */
  checkAvailability(
    query: Queries.CheckAvailabilityQuery,
  ): Promise<AvailabilityCheck>;

  /** Получить товары с низким остатком */
  getLowStock(query: Queries.GetLowStockQuery): Promise<AggregatedStock[]>;

  /** Получить статистику локации */
  getLocationStatistics(
    query: Queries.GetLocationStockStatisticsQuery,
  ): Promise<LocationStockStatistics>;
}

export const BATCH_LOCATION_PORT = Symbol('BATCH_LOCATION_PORT');
