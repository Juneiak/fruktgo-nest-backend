import { Types } from 'mongoose';
import { BatchStatus, ExpirationAlertLevel } from './batch.enums';

/**
 * Получить партию по ID
 */
export class GetBatchByIdQuery {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}

/**
 * Получить партию по QR-коду
 */
export class GetBatchByQRCodeQuery {
  constructor(public readonly qrCode: string) {}
}

/**
 * Получить партию по номеру у продавца
 */
export class GetBatchByNumberQuery {
  constructor(
    public readonly sellerId: Types.ObjectId | string,
    public readonly batchNumber: string,
  ) {}
}

/**
 * Получить партии товара у продавца
 */
export class GetBatchesByProductQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      status?: BatchStatus | BatchStatus[];
      /** Сортировать по сроку (FEFO) */
      sortByExpiration?: boolean;
    },
  ) {}
}

/**
 * Получить партии в локации
 */
export class GetBatchesInLocationQuery {
  constructor(
    public readonly data: {
      locationType: 'SHOP' | 'WAREHOUSE';
      locationId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      status?: BatchStatus | BatchStatus[];
      /** Сортировать по сроку (FEFO) */
      sortByExpiration?: boolean;
    },
  ) {}
}

/**
 * Получить партии с истекающим сроком
 */
export class GetExpiringBatchesQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      /** Уровень алерта */
      alertLevel?: ExpirationAlertLevel | ExpirationAlertLevel[];
      /** Дней до истечения (альтернатива alertLevel) */
      daysUntilExpiration?: number;
      /** Только определённые локации */
      locationIds?: Array<Types.ObjectId | string>;
      locationType?: 'SHOP' | 'WAREHOUSE';
    },
  ) {}
}

/**
 * Получить истёкшие партии для автосписания
 */
export class GetExpiredBatchesForWriteOffQuery {
  constructor(
    public readonly data: {
      sellerId?: Types.ObjectId | string;
      /** Истекли более N дней назад */
      expiredDaysAgo?: number;
    },
  ) {}
}

/**
 * Получить партии для автоконсолидации (мелкие остатки)
 */
export class GetBatchesForConsolidationQuery {
  constructor(
    public readonly data: {
      locationType: 'SHOP' | 'WAREHOUSE';
      locationId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      /** Максимальное количество для консолидации */
      maxQuantity: number;
    },
  ) {}
}

/**
 * Получить смешанные партии
 */
export class GetMixedBatchesQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Поиск партий с фильтрами
 */
export class SearchBatchesQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      status?: BatchStatus | BatchStatus[];
      supplier?: string;
      batchNumber?: string;
      fromDate?: Date;
      toDate?: Date;
      alertLevel?: ExpirationAlertLevel | ExpirationAlertLevel[];
      isMixedBatch?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: 'effectiveExpirationDate' | 'createdAt' | 'currentQuantity';
      sortOrder?: 'asc' | 'desc';
    },
  ) {}
}

/**
 * Получить статистику партий
 */
export class GetBatchStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      locationId?: Types.ObjectId | string;
      locationType?: 'SHOP' | 'WAREHOUSE';
    },
  ) {}
}
