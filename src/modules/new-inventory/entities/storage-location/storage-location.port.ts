import { StorageLocation } from './storage-location.schema';
import * as Commands from './storage-location.commands';
import * as Queries from './storage-location.queries';

/**
 * Порт модуля StorageLocation
 */
export interface StorageLocationPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать локацию */
  create(command: Commands.CreateStorageLocationCommand): Promise<StorageLocation>;

  /** Обновить локацию */
  update(command: Commands.UpdateStorageLocationCommand): Promise<StorageLocation>;

  /** Обновить условия */
  updateConditions(command: Commands.UpdateConditionsCommand): Promise<StorageLocation>;

  /** Изменить статус */
  updateStatus(
    command: Commands.UpdateStorageLocationStatusCommand,
  ): Promise<StorageLocation>;

  /** Добавить зону */
  addZone(command: Commands.AddStorageZoneCommand): Promise<StorageLocation>;

  /** Обновить зону */
  updateZone(command: Commands.UpdateStorageZoneCommand): Promise<StorageLocation>;

  /** Удалить зону */
  removeZone(command: Commands.RemoveStorageZoneCommand): Promise<StorageLocation>;

  /** Пересчитать коэффициент деградации */
  recalculateDegradation(
    command: Commands.RecalculateDegradationCommand,
  ): Promise<number>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetStorageLocationByIdQuery): Promise<StorageLocation | null>;

  /** Получить по магазину */
  getByShop(
    query: Queries.GetStorageLocationByShopQuery,
  ): Promise<StorageLocation | null>;

  /** Получить по складу */
  getByWarehouse(
    query: Queries.GetStorageLocationByWarehouseQuery,
  ): Promise<StorageLocation | null>;

  /** Получить все локации продавца */
  getBySeller(
    query: Queries.GetStorageLocationsBySellerQuery,
  ): Promise<{ items: StorageLocation[]; total: number }>;

  /** Получить количество */
  count(query: Queries.CountStorageLocationsQuery): Promise<number>;
}

export const STORAGE_LOCATION_PORT = Symbol('STORAGE_LOCATION_PORT');
