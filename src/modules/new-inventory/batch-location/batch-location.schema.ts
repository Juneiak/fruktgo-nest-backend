import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { LocationType, BatchLocationStatus, QuantityChangeReason } from './batch-location.enums';
import { Batch } from '../batch/batch.schema';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: История изменений количества
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class QuantityChangeLog {
  /** Время изменения */
  @Prop({ type: Date, required: true })
  changedAt: Date;

  /** Причина изменения */
  @Prop({
    type: String,
    enum: Object.values(QuantityChangeReason),
    required: true,
  })
  reason: QuantityChangeReason;

  /** Изменение количества (может быть отрицательным) */
  @Prop({ type: Number, required: true })
  quantityDelta: number;

  /** Количество до изменения */
  @Prop({ type: Number, required: true })
  quantityBefore: number;

  /** Количество после изменения */
  @Prop({ type: Number, required: true })
  quantityAfter: number;

  /** Кто изменил */
  @Prop({ type: Types.ObjectId })
  changedBy?: Types.ObjectId;

  /** ID связанного документа (Order, WriteOff, Transfer, etc.) */
  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId;

  /** Тип связанного документа */
  @Prop({ type: String })
  referenceType?: string;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}

export const QuantityChangeLogSchema =
  SchemaFactory.createForClass(QuantityChangeLog);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА BATCH_LOCATION
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_batch_locations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class BatchLocation {
  _id: Types.ObjectId;
  readonly batchLocationId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // СВЯЗИ
  // ═══════════════════════════════════════════════════════════════

  /** Партия */
  @Prop({ type: Types.ObjectId, ref: Batch.name, required: true, index: true })
  batch: Types.ObjectId;

  /** Продавец (денормализация для быстрых запросов) */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  /** Товар (денормализация для быстрых запросов) */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  product: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ЛОКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  /** Тип локации */
  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
    index: true,
  })
  locationType: LocationType;

  /** Shop ID (если SHOP) */
  @Prop({ type: Types.ObjectId, index: true })
  shop?: Types.ObjectId;

  /** Warehouse ID (если WAREHOUSE) */
  @Prop({ type: Types.ObjectId, index: true })
  warehouse?: Types.ObjectId;

  /** Название локации (денормализация) */
  @Prop({ type: String })
  locationName?: string;

  // ═══════════════════════════════════════════════════════════════
  // КОЛИЧЕСТВО
  // ═══════════════════════════════════════════════════════════════

  /** Текущий остаток в этой локации */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  quantity: number;

  /** Зарезервировано для заказов */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  reservedQuantity: number;

  // ═══════════════════════════════════════════════════════════════
  // ДЕГРАДАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  /** Коэффициент деградации в этой локации */
  @Prop({ type: Number, required: true, default: 1.0 })
  degradationCoefficient: number;

  /** Дата прибытия в локацию */
  @Prop({ type: Date, required: true })
  arrivedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ДЕНОРМАЛИЗОВАННЫЕ ДАННЫЕ ПАРТИИ (для FEFO)
  // ═══════════════════════════════════════════════════════════════

  /** Срок годности партии (для сортировки FEFO) */
  @Prop({ type: Date, required: true, index: true })
  effectiveExpirationDate: Date;

  /** Свежесть партии */
  @Prop({ type: Number, required: true, min: 0, max: 10 })
  freshnessRemaining: number;

  /** Закупочная цена (для расчёта себестоимости) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  // ═══════════════════════════════════════════════════════════════
  // СТАТУС
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(BatchLocationStatus),
    default: BatchLocationStatus.ACTIVE,
    index: true,
  })
  status: BatchLocationStatus;

  // ═══════════════════════════════════════════════════════════════
  // ИСТОРИЯ ИЗМЕНЕНИЙ
  // ═══════════════════════════════════════════════════════════════

  /** История изменений количества (последние N записей) */
  @Prop({ type: [QuantityChangeLogSchema], default: [] })
  changeLog: QuantityChangeLog[];
}

export const BatchLocationSchema = SchemaFactory.createForClass(BatchLocation);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

// Составной индекс для поиска остатков товара в локации
BatchLocationSchema.index({
  locationType: 1,
  shop: 1,
  product: 1,
  status: 1,
});

BatchLocationSchema.index({
  locationType: 1,
  warehouse: 1,
  product: 1,
  status: 1,
});

// Индекс для FEFO — сортировка по сроку
BatchLocationSchema.index({
  seller: 1,
  product: 1,
  locationType: 1,
  shop: 1,
  effectiveExpirationDate: 1,
});

// Индекс для быстрого поиска по партии
BatchLocationSchema.index({ batch: 1 });

// Уникальный индекс: партия + локация
BatchLocationSchema.index(
  { batch: 1, locationType: 1, shop: 1, warehouse: 1 },
  { unique: true },
);

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

BatchLocationSchema.virtual('batchLocationId').get(function () {
  return this._id?.toHexString();
});

/** Доступное количество (quantity - reservedQuantity) */
BatchLocationSchema.virtual('availableQuantity').get(function () {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

/** ID локации (shop или warehouse) */
BatchLocationSchema.virtual('locationId').get(function () {
  return this.locationType === LocationType.SHOP ? this.shop : this.warehouse;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type BatchLocationDocument = HydratedDocument<BatchLocation>;
export type BatchLocationModel = Model<BatchLocation>;
