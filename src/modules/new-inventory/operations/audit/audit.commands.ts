import { Types } from 'mongoose';
import { AuditType } from './audit.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

/**
 * Создать инвентаризацию
 */
export class CreateAuditCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      type: AuditType;
      locationType: LocationType;
      locationId: Types.ObjectId | string;
      locationName?: string;
      /** Фильтр по продуктам (для PARTIAL) */
      filterProducts?: Array<Types.ObjectId | string>;
      /** Фильтр по категориям (для PARTIAL) */
      filterCategories?: Array<Types.ObjectId | string>;
      /** Фильтр по истекающим (дней) */
      filterExpiringWithinDays?: number;
      comment?: string;
      createdBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Начать инвентаризацию — загружает текущие остатки
 */
export class StartAuditCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly data: {
      startedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Ввести фактическое количество для позиции
 */
export class CountAuditItemCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data: {
      actualQuantity: number;
      comment?: string;
      photos?: string[];
      countedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Массовый ввод количеств
 */
export class BulkCountAuditItemsCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly items: Array<{
      itemIndex: number;
      actualQuantity: number;
      comment?: string;
    }>,
    public readonly countedBy: Types.ObjectId | string,
  ) {}
}

/**
 * Пропустить позицию
 */
export class SkipAuditItemCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly data?: {
      reason?: string;
    },
  ) {}
}

/**
 * Завершить инвентаризацию
 */
export class CompleteAuditCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly data: {
      completedBy: Types.ObjectId | string;
      /** Применить корректировки к остаткам */
      applyCorrections?: boolean;
    },
  ) {}
}

/**
 * Применить корректировки к остаткам (если не было при завершении)
 */
export class ApplyAuditCorrectionsCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly data: {
      appliedBy: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Отменить инвентаризацию
 */
export class CancelAuditCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly data?: {
      reason?: string;
      cancelledBy?: Types.ObjectId | string;
    },
  ) {}
}

/**
 * Добавить фото к позиции
 */
export class AddAuditItemPhotosCommand {
  constructor(
    public readonly auditId: Types.ObjectId | string,
    public readonly itemIndex: number,
    public readonly photos: string[],
  ) {}
}
