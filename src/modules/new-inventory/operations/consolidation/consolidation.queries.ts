import { Types } from 'mongoose';

/**
 * Получить MixedBatch по ID
 */
export class GetMixedBatchByIdQuery {
  constructor(public readonly mixedBatchId: Types.ObjectId | string) {}
}

/**
 * Получить состав MixedBatch (для трассировки)
 */
export class GetMixedBatchCompositionQuery {
  constructor(public readonly mixedBatchId: Types.ObjectId | string) {}
}

/**
 * Получить все MixedBatch продукта в локации
 */
export class GetMixedBatchesQuery {
  constructor(
    public readonly data: {
      locationId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Найти кандидатов на консолидацию
 */
export class FindConsolidationCandidatesQuery {
  constructor(
    public readonly data: {
      locationId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      /** Консолидировать остатки меньше этого количества */
      minQuantityThreshold: number;
      /** Минимум партий для консолидации */
      minBatchCount?: number;
    },
  ) {}
}

/**
 * Получить MixedBatch, содержащие указанную партию (трассировка)
 */
export class GetMixedBatchesByComponentQuery {
  constructor(public readonly batchId: Types.ObjectId | string) {}
}

/**
 * Получить историю консолидаций для продукта
 */
export class GetConsolidationHistoryQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      productId?: Types.ObjectId | string;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {}
}

/**
 * Статистика консолидаций
 */
export class GetConsolidationStatisticsQuery {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      locationId?: Types.ObjectId | string;
      fromDate?: Date;
      toDate?: Date;
    },
  ) {}
}
