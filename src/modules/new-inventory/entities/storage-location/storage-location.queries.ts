import { Types } from 'mongoose';
import {
  StorageLocationType,
  StorageLocationStatus,
} from './storage-location.enums';

/**
 * Получить по ID
 */
export class GetStorageLocationByIdQuery {
  constructor(public readonly locationId: Types.ObjectId | string) {}
}

/**
 * Получить по магазину
 */
export class GetStorageLocationByShopQuery {
  constructor(public readonly shopId: Types.ObjectId | string) {}
}

/**
 * Получить по складу
 */
export class GetStorageLocationByWarehouseQuery {
  constructor(public readonly warehouseId: Types.ObjectId | string) {}
}

/**
 * Получить все локации продавца
 */
export class GetStorageLocationsBySellerQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationType?: StorageLocationType;
      status?: StorageLocationStatus | StorageLocationStatus[];
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Получить количество локаций
 */
export class CountStorageLocationsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationType?: StorageLocationType;
      status?: StorageLocationStatus | StorageLocationStatus[];
    },
  ) {}
}
