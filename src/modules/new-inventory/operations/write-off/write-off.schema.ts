import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { WriteOffStatus } from './write-off.enums';
import { WriteOffReason } from '../../batch/batch.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция списания
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class WriteOffItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, required: true })
  batch: Types.ObjectId;

  /** Product ID (денормализация) */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  /** Количество для списания */
  @Prop({ type: Number, required: true, min: 0.001 })
  quantity: number;

  /** Причина для этой позиции */
  @Prop({ type: String, enum: Object.values(WriteOffReason) })
  reason?: WriteOffReason;

  /** Закупочная цена (для расчёта потерь) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;

  /** Фото (для подтверждения порчи) */
  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const WriteOffItemSchema = SchemaFactory.createForClass(WriteOffItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА WRITE_OFF
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_write_offs',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class WriteOff {
  _id: Types.ObjectId;
  readonly writeOffId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ДОКУМЕНТ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String, required: true, index: true })
  documentNumber: string;

  @Prop({
    type: String,
    enum: Object.values(WriteOffStatus),
    default: WriteOffStatus.DRAFT,
    index: true,
  })
  status: WriteOffStatus;

  // ═══════════════════════════════════════════════════════════════
  // ЛОКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  warehouse?: Types.ObjectId;

  @Prop({ type: String })
  locationName?: string;

  // ═══════════════════════════════════════════════════════════════
  // ПРИЧИНА
  // ═══════════════════════════════════════════════════════════════

  /** Общая причина списания */
  @Prop({
    type: String,
    enum: Object.values(WriteOffReason),
    required: true,
  })
  reason: WriteOffReason;

  // ═══════════════════════════════════════════════════════════════
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [WriteOffItemSchema], required: true, default: [] })
  items: WriteOffItem[];

  // ═══════════════════════════════════════════════════════════════
  // СУММЫ
  // ═══════════════════════════════════════════════════════════════

  /** Общая сумма потерь (по закупочным ценам) */
  @Prop({ type: Number, min: 0, default: 0 })
  totalLoss: number;

  // ═══════════════════════════════════════════════════════════════
  // УЧАСТНИКИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  confirmedBy?: Types.ObjectId;

  @Prop({ type: Date })
  confirmedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;

  /** Фото документа/акта списания */
  @Prop({ type: [String], default: [] })
  documentPhotos: string[];
}

export const WriteOffSchema = SchemaFactory.createForClass(WriteOff);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

WriteOffSchema.index({ seller: 1, status: 1 });
WriteOffSchema.index({ seller: 1, documentNumber: 1 }, { unique: true });
WriteOffSchema.index({ seller: 1, createdAt: -1 });
WriteOffSchema.index({ seller: 1, reason: 1 });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

WriteOffSchema.virtual('writeOffId').get(function () {
  return this._id?.toHexString();
});

WriteOffSchema.virtual('locationId').get(function () {
  return this.locationType === LocationType.SHOP ? this.shop : this.warehouse;
});

WriteOffSchema.virtual('itemsCount').get(function () {
  return this.items?.length || 0;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type WriteOffDocument = HydratedDocument<WriteOff>;
export type WriteOffModel = Model<WriteOff>;
