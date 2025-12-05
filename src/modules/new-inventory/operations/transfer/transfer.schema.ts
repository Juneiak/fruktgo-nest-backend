import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { TransferStatus, TransferType } from './transfer.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция перемещения
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class TransferItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, required: true })
  batch: Types.ObjectId;

  /** Product ID (денормализация) */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  /** Количество для перемещения */
  @Prop({ type: Number, required: true, min: 0.001 })
  quantity: number;

  /** Фактически отправленное количество */
  @Prop({ type: Number, min: 0 })
  sentQuantity?: number;

  /** Фактически полученное количество */
  @Prop({ type: Number, min: 0 })
  receivedQuantity?: number;

  /** Пересчитанный срок годности в новой локации */
  @Prop({ type: Date })
  newEffectiveExpiration?: Date;

  /** Пересчитанный запас свежести */
  @Prop({ type: Number })
  newFreshnessRemaining?: number;

  /** Комментарий (расхождение) */
  @Prop({ type: String })
  comment?: string;
}

export const TransferItemSchema = SchemaFactory.createForClass(TransferItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА TRANSFER
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_transfers',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Transfer {
  _id: Types.ObjectId;
  readonly transferId?: string;
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
    enum: Object.values(TransferType),
    default: TransferType.INTERNAL,
  })
  type: TransferType;

  @Prop({
    type: String,
    enum: Object.values(TransferStatus),
    default: TransferStatus.DRAFT,
    index: true,
  })
  status: TransferStatus;

  // ═══════════════════════════════════════════════════════════════
  // ИСТОЧНИК
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  sourceType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  sourceShop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  sourceWarehouse?: Types.ObjectId;

  @Prop({ type: String })
  sourceName?: string;

  // ═══════════════════════════════════════════════════════════════
  // НАЗНАЧЕНИЕ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  targetType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  targetShop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  targetWarehouse?: Types.ObjectId;

  @Prop({ type: String })
  targetName?: string;

  // ═══════════════════════════════════════════════════════════════
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [TransferItemSchema], required: true, default: [] })
  items: TransferItem[];

  // ═══════════════════════════════════════════════════════════════
  // УЧАСТНИКИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  sentBy?: Types.ObjectId;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop({ type: Types.ObjectId })
  receivedBy?: Types.ObjectId;

  @Prop({ type: Date })
  receivedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: String })
  cancellationReason?: string;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

TransferSchema.index({ seller: 1, status: 1 });
TransferSchema.index({ seller: 1, documentNumber: 1 }, { unique: true });
TransferSchema.index({ seller: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

TransferSchema.virtual('transferId').get(function () {
  return this._id?.toHexString();
});

TransferSchema.virtual('sourceId').get(function () {
  return this.sourceType === LocationType.SHOP
    ? this.sourceShop
    : this.sourceWarehouse;
});

TransferSchema.virtual('targetId').get(function () {
  return this.targetType === LocationType.SHOP
    ? this.targetShop
    : this.targetWarehouse;
});

TransferSchema.virtual('itemsCount').get(function () {
  return this.items?.length || 0;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type TransferDocument = HydratedDocument<Transfer>;
export type TransferModel = Model<Transfer>;
