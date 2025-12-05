import { Types } from 'mongoose';
import { MixedBatch } from '../../batch/mixed-batch.schema';

/**
 * Информация о партии для консолидации
 */
export interface BatchForConsolidation {
  batchId: Types.ObjectId | string;
  batchLocationId: Types.ObjectId | string;
  quantity: number;
  freshness?: number;
  expirationDate?: Date;
}

/**
 * Результат консолидации
 */
export interface ConsolidationResult {
  /** Созданная смешанная партия */
  mixedBatch: MixedBatch;
  /** Количество объединённых партий */
  consolidatedCount: number;
  /** Общее количество */
  totalQuantity: number;
  /** Обновлённые BatchLocation */
  updatedLocations: string[];
}

/**
 * Состав смешанной партии (для трассировки)
 */
export interface MixedBatchComposition {
  mixedBatchId: string;
  product: {
    id: string;
    name: string;
  };
  location: {
    id: string;
    name: string;
  };
  components: Array<{
    batchId: string;
    batchNumber?: string;
    quantity: number;
    percentOfTotal: number;
    originalExpirationDate?: Date;
    freshnessAtMixing?: number;
  }>;
  totalQuantity: number;
  effectiveExpirationDate: Date;
  effectiveFreshness: number;
  createdAt: Date;
  reason: string;
}

/**
 * Кандидат на консолидацию
 */
export interface ConsolidationCandidate {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  batches: Array<{
    batchId: string;
    batchLocationId: string;
    quantity: number;
    expirationDate?: Date;
  }>;
  totalQuantity: number;
  batchCount: number;
}
