import { Types } from 'mongoose';
import { BatchForConsolidation } from './consolidation.types';

/**
 * Автоматическая консолидация мелких остатков
 */
export class AutoConsolidateCommand {
  constructor(
    public readonly data: {
      locationId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      /** Консолидировать остатки меньше этого количества */
      minQuantityThreshold: number;
      /** Кто инициировал (если вручную) */
      initiatedBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Консолидация при инвентаризации
 */
export class ConsolidateAtAuditCommand {
  constructor(
    public readonly data: {
      auditId: Types.ObjectId | string;
      locationId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      /** Обнаруженные партии с количествами */
      foundBatches: BatchForConsolidation[];
      /** Сотрудник */
      performedBy: Types.ObjectId | string;
      /** Заметки */
      notes?: string;
    },
  ) {}
}

/**
 * Ручная консолидация указанных партий
 */
export class ManualConsolidateCommand {
  constructor(
    public readonly data: {
      locationId: Types.ObjectId | string;
      productId: Types.ObjectId | string;
      /** Партии для объединения */
      batches: BatchForConsolidation[];
      /** Кто выполняет */
      performedBy: Types.ObjectId | string;
      /** Причина/заметки */
      notes?: string;
    },
  ) {}
}

/**
 * Автоконсолидация всех товаров в локации
 */
export class AutoConsolidateLocationCommand {
  constructor(
    public readonly data: {
      locationId: Types.ObjectId | string;
      /** Порог количества */
      minQuantityThreshold: number;
    },
  ) {}
}

/**
 * Автоконсолидация для всего продавца (cron job)
 */
export class AutoConsolidateSellerCommand {
  constructor(
    public readonly data: {
      sellerId: Types.ObjectId | string;
      /** Порог количества */
      minQuantityThreshold: number;
    },
  ) {}
}

/**
 * Деактивировать MixedBatch (полностью израсходован)
 */
export class DeactivateMixedBatchCommand {
  constructor(public readonly mixedBatchId: Types.ObjectId | string) {}
}
