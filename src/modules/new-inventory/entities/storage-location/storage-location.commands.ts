import { Types } from 'mongoose';
import {
  StorageLocationType,
  StorageLocationStatus,
  StorageEquipmentType,
} from './storage-location.enums';
import { TemperatureRange, HumidityRange } from '../../core/storage-preset';

/**
 * Создать локацию хранения
 */
export class CreateStorageLocationCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      locationType: StorageLocationType;
      shop?: Types.ObjectId | string;
      warehouse?: Types.ObjectId | string;
      name: string;
      address?: string;
      defaultConditions?: {
        temperature?: TemperatureRange;
        humidity?: HumidityRange;
      };
      notes?: string;
    },
  ) {}
}

/**
 * Обновить локацию
 */
export class UpdateStorageLocationCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly data: {
      name?: string;
      address?: string;
      notes?: string;
    },
  ) {}
}

/**
 * Обновить условия хранения
 */
export class UpdateConditionsCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly data: {
      temperature?: TemperatureRange;
      humidity?: HumidityRange;
      source?: string;
    },
  ) {}
}

/**
 * Изменить статус
 */
export class UpdateStorageLocationStatusCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly status: StorageLocationStatus,
  ) {}
}

/**
 * Добавить зону хранения
 */
export class AddStorageZoneCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly data: {
      name: string;
      equipmentType?: StorageEquipmentType;
      conditions?: {
        temperature?: TemperatureRange;
        humidity?: HumidityRange;
      };
      capacity?: number;
    },
  ) {}
}

/**
 * Обновить зону хранения
 */
export class UpdateStorageZoneCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly zoneId: Types.ObjectId | string,
    public readonly data: {
      name?: string;
      equipmentType?: StorageEquipmentType;
      conditions?: {
        temperature?: TemperatureRange;
        humidity?: HumidityRange;
      };
      capacity?: number;
    },
  ) {}
}

/**
 * Удалить зону хранения
 */
export class RemoveStorageZoneCommand {
  constructor(
    public readonly locationId: Types.ObjectId | string,
    public readonly zoneId: Types.ObjectId | string,
  ) {}
}

/**
 * Пересчитать коэффициент деградации
 */
export class RecalculateDegradationCommand {
  constructor(public readonly locationId: Types.ObjectId | string) {}
}
