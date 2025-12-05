import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  BatchStatus,
  ExpirationAlertLevel,
  FreshnessAdjustmentReason,
} from './batch.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМЫ
// ═══════════════════════════════════════════════════════════════

/**
 * Запись о ручной корректировке свежести
 */
@Schema({ _id: false })
export class FreshnessAdjustment {
  /** Время корректировки */
  @Prop({ type: Date, required: true })
  adjustedAt: Date;

  /** Кто сделал корректировку (Employee ID) */
  @Prop({ type: Types.ObjectId, required: true })
  adjustedBy: Types.ObjectId;

  /** Роль пользователя */
  @Prop({ type: String })
  adjustedByRole?: string;

  /** Значение ДО корректировки (0-10) */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  previousFreshness: number;

  /** Новое значение (0-10) */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  newFreshness: number;

  /** Причина корректировки */
  @Prop({
    type: String,
    enum: Object.values(FreshnessAdjustmentReason),
    required: true,
  })
  reason: FreshnessAdjustmentReason;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}

export const FreshnessAdjustmentSchema =
  SchemaFactory.createForClass(FreshnessAdjustment);

/**
 * Запись истории локаций (для аудита и расчёта потраченной свежести)
 */
@Schema({ _id: false })
export class BatchLocationHistory {
  /** Тип локации */
  @Prop({ type: String, enum: ['SHOP', 'WAREHOUSE'], required: true })
  locationType: 'SHOP' | 'WAREHOUSE';

  /** ID локации (Shop или Warehouse) */
  @Prop({ type: Types.ObjectId, required: true })
  locationId: Types.ObjectId;

  /** Название локации (для отображения) */
  @Prop({ type: String })
  locationName?: string;

  /** Дата прибытия в локацию */
  @Prop({ type: Date, required: true })
  arrivedAt: Date;

  /** Дата отбытия из локации */
  @Prop({ type: Date })
  departedAt?: Date;

  /** Коэффициент деградации в этой локации */
  @Prop({ type: Number, required: true, default: 1.0 })
  degradationCoefficient: number;

  /** Свежесть на момент прибытия */
  @Prop({ type: Number, required: true })
  freshnessOnArrival: number;

  /** Свежесть на момент отбытия */
  @Prop({ type: Number })
  freshnessOnDeparture?: number;
}

export const BatchLocationHistorySchema =
  SchemaFactory.createForClass(BatchLocationHistory);

/**
 * Текущая локация партии
 */
@Schema({ _id: false })
export class BatchCurrentLocation {
  /** Тип локации */
  @Prop({ type: String, enum: ['SHOP', 'WAREHOUSE'], required: true })
  locationType: 'SHOP' | 'WAREHOUSE';

  /** ID локации */
  @Prop({ type: Types.ObjectId, required: true })
  locationId: Types.ObjectId;

  /** Название локации */
  @Prop({ type: String })
  locationName?: string;

  /** Дата прибытия */
  @Prop({ type: Date, required: true })
  arrivedAt: Date;

  /** Коэффициент деградации */
  @Prop({ type: Number, required: true, default: 1.0 })
  degradationCoefficient: number;
}

export const BatchCurrentLocationSchema =
  SchemaFactory.createForClass(BatchCurrentLocation);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА BATCH
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_batches',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Batch {
  _id: Types.ObjectId;
  readonly batchId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ И ТОВАР
  // ═══════════════════════════════════════════════════════════════

  /** Владелец (продавец) */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  /** Товар (Product из основного модуля) */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  product: Types.ObjectId;

  /** Номер партии (генерируется или от поставщика) */
  @Prop({ type: String, required: true, index: true })
  batchNumber: string;

  // ═══════════════════════════════════════════════════════════════
  // ДАТЫ И СРОКИ ГОДНОСТИ
  // ═══════════════════════════════════════════════════════════════

  /** Дата производства */
  @Prop({ type: Date })
  productionDate?: Date;

  /** Дата приёмки в систему */
  @Prop({ type: Date, required: true })
  receivedAt: Date;

  /** Оригинальный срок от поставщика */
  @Prop({ type: Date, required: true })
  originalExpirationDate: Date;

  /** Расчётный/динамический срок (пересчитывается при перемещении) */
  @Prop({ type: Date, required: true, index: true })
  effectiveExpirationDate: Date;

  // ═══════════════════════════════════════════════════════════════
  // СВЕЖЕСТЬ (Freshness)
  // ═══════════════════════════════════════════════════════════════

  /** Запас свежести (0-10, где 10 = полностью свежий) */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  freshnessRemaining: number;

  /** Начальный запас свежести при приёмке (для аналитики) */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  initialFreshness: number;

  /** Последний пересчёт свежести */
  @Prop({ type: Date })
  freshnessLastCalculatedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // ПОСТАВЩИК
  // ═══════════════════════════════════════════════════════════════

  /** Название поставщика */
  @Prop({ type: String })
  supplier?: string;

  /** Номер накладной поставщика */
  @Prop({ type: String })
  supplierInvoice?: string;

  /** Закупочная цена за единицу */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  // ═══════════════════════════════════════════════════════════════
  // КОЛИЧЕСТВО
  // ═══════════════════════════════════════════════════════════════

  /** Начальное количество при приёмке */
  @Prop({ type: Number, min: 0, required: true })
  initialQuantity: number;

  /** Текущее общее количество (сумма по всем локациям) */
  @Prop({ type: Number, min: 0, required: true })
  currentQuantity: number;

  // ═══════════════════════════════════════════════════════════════
  // СТАТУС
  // ═══════════════════════════════════════════════════════════════

  /** Статус партии */
  @Prop({
    type: String,
    enum: Object.values(BatchStatus),
    default: BatchStatus.ACTIVE,
    index: true,
  })
  status: BatchStatus;

  /** Причина блокировки */
  @Prop({ type: String })
  blockReason?: string;

  /** Комментарий к статусу */
  @Prop({ type: String })
  statusComment?: string;

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ЛОКАЦИЙ
  // ═══════════════════════════════════════════════════════════════

  /** Полная история перемещений */
  @Prop({ type: [BatchLocationHistorySchema], default: [] })
  locationHistory: BatchLocationHistory[];

  /** Текущая локация */
  @Prop({ type: BatchCurrentLocationSchema })
  currentLocation?: BatchCurrentLocation;

  // ═══════════════════════════════════════════════════════════════
  // РУЧНЫЕ КОРРЕКТИРОВКИ
  // ═══════════════════════════════════════════════════════════════

  /** История ручных корректировок свежести */
  @Prop({ type: [FreshnessAdjustmentSchema], default: [] })
  freshnessAdjustments: FreshnessAdjustment[];

  // ═══════════════════════════════════════════════════════════════
  // QR-КОД
  // ═══════════════════════════════════════════════════════════════

  /** QR-код для быстрой идентификации */
  @Prop({ type: String, index: true })
  qrCode?: string;

  // ═══════════════════════════════════════════════════════════════
  // СВЯЗЬ С ПРИЁМКОЙ
  // ═══════════════════════════════════════════════════════════════

  /** ID документа приёмки */
  @Prop({ type: Types.ObjectId })
  receivingId?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // MIXED BATCH (смешанная партия)
  // ═══════════════════════════════════════════════════════════════

  /** Является смешанной партией? */
  @Prop({ type: Boolean, default: false })
  isMixedBatch: boolean;

  /** ID исходных партий (если смешанная) */
  @Prop({ type: [Types.ObjectId], default: [] })
  sourceBatches: Types.ObjectId[];

  /** Причина смешивания */
  @Prop({ type: String })
  mixingReason?: string;
}

export const BatchSchema = SchemaFactory.createForClass(Batch);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

// Составной индекс для поиска партий товара у продавца
BatchSchema.index({ seller: 1, product: 1, status: 1 });

// Индекс для FEFO — сортировка по сроку годности
BatchSchema.index({ seller: 1, product: 1, effectiveExpirationDate: 1 });

// Индекс для поиска по QR-коду
BatchSchema.index({ qrCode: 1 }, { sparse: true });

// Индекс для поиска по номеру партии у продавца
BatchSchema.index({ seller: 1, batchNumber: 1 });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

BatchSchema.virtual('batchId').get(function () {
  return this._id?.toHexString();
});

/**
 * Дни до истечения срока
 */
BatchSchema.virtual('daysUntilExpiration').get(function () {
  if (!this.effectiveExpirationDate) return null;
  const now = new Date();
  const diff = this.effectiveExpirationDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Уровень алерта по сроку
 */
BatchSchema.virtual('expirationAlertLevel').get(function () {
  const days = (this as any).daysUntilExpiration;
  if (days === null) return ExpirationAlertLevel.NORMAL;
  if (days <= 0) return ExpirationAlertLevel.EXPIRED;
  if (days <= 3) return ExpirationAlertLevel.CRITICAL;
  if (days <= 7) return ExpirationAlertLevel.WARNING;
  return ExpirationAlertLevel.NORMAL;
});

/**
 * Статус свежести
 */
BatchSchema.virtual('freshnessStatus').get(function () {
  const freshness = this.freshnessRemaining;
  if (freshness >= 8) return 'FRESH';
  if (freshness >= 5) return 'GOOD';
  if (freshness >= 3) return 'WARNING';
  if (freshness > 0) return 'CRITICAL';
  return 'EXPIRED';
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type BatchDocument = HydratedDocument<Batch>;
export type BatchModel = Model<Batch>;
