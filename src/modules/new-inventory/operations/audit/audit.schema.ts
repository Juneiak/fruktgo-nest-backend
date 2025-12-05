import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  AuditType,
  AuditStatus,
  AuditItemStatus,
  DiscrepancyType,
} from './audit.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция инвентаризации
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class AuditItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, required: true })
  batch: Types.ObjectId;

  /** BatchLocation */
  @Prop({ type: Types.ObjectId, required: true })
  batchLocation: Types.ObjectId;

  /** Product ID */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  /** Название продукта (денормализация) */
  @Prop({ type: String })
  productName?: string;

  /** Номер партии (денормализация) */
  @Prop({ type: String })
  batchNumber?: string;

  /** Ожидаемое количество (из системы) */
  @Prop({ type: Number, required: true, min: 0 })
  expectedQuantity: number;

  /** Фактическое количество (введённое) */
  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  /** Расхождение (actualQuantity - expectedQuantity) */
  @Prop({ type: Number })
  discrepancy?: number;

  /** Тип расхождения */
  @Prop({
    type: String,
    enum: Object.values(DiscrepancyType),
    default: DiscrepancyType.NONE,
  })
  discrepancyType: DiscrepancyType;

  /** Статус позиции */
  @Prop({
    type: String,
    enum: Object.values(AuditItemStatus),
    default: AuditItemStatus.PENDING,
  })
  status: AuditItemStatus;

  /** Кто подсчитал */
  @Prop({ type: Types.ObjectId })
  countedBy?: Types.ObjectId;

  /** Когда подсчитали */
  @Prop({ type: Date })
  countedAt?: Date;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;

  /** Фото (для подтверждения) */
  @Prop({ type: [String], default: [] })
  photos: string[];

  /** Срок годности партии */
  @Prop({ type: Date })
  expirationDate?: Date;
}

export const AuditItemSchema = SchemaFactory.createForClass(AuditItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА AUDIT
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_audits',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Audit {
  _id: Types.ObjectId;
  readonly auditId?: string;
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
    enum: Object.values(AuditType),
    required: true,
  })
  type: AuditType;

  @Prop({
    type: String,
    enum: Object.values(AuditStatus),
    default: AuditStatus.DRAFT,
    index: true,
  })
  status: AuditStatus;

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
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [AuditItemSchema], required: true, default: [] })
  items: AuditItem[];

  // ═══════════════════════════════════════════════════════════════
  // ФИЛЬТРЫ (для PARTIAL)
  // ═══════════════════════════════════════════════════════════════

  /** Только определённые продукты */
  @Prop({ type: [Types.ObjectId], default: [] })
  filterProducts: Types.ObjectId[];

  /** Только определённые категории */
  @Prop({ type: [Types.ObjectId], default: [] })
  filterCategories: Types.ObjectId[];

  /** Только истекающие (дней до истечения) */
  @Prop({ type: Number })
  filterExpiringWithinDays?: number;

  // ═══════════════════════════════════════════════════════════════
  // ИТОГИ
  // ═══════════════════════════════════════════════════════════════

  /** Всего позиций */
  @Prop({ type: Number, default: 0 })
  totalItems: number;

  /** Подсчитано позиций */
  @Prop({ type: Number, default: 0 })
  countedItems: number;

  /** Позиций с расхождением */
  @Prop({ type: Number, default: 0 })
  discrepancyItems: number;

  /** Общий излишек (ед.) */
  @Prop({ type: Number, default: 0 })
  totalSurplus: number;

  /** Общая недостача (ед.) */
  @Prop({ type: Number, default: 0 })
  totalShortage: number;

  /** Применить корректировки */
  @Prop({ type: Boolean, default: false })
  applyCorrections: boolean;

  // ═══════════════════════════════════════════════════════════════
  // УЧАСТНИКИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  startedBy?: Types.ObjectId;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Types.ObjectId })
  completedBy?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId })
  appliedBy?: Types.ObjectId;

  @Prop({ type: Date })
  appliedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;

  @Prop({ type: String })
  cancellationReason?: string;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

AuditSchema.index({ seller: 1, status: 1 });
AuditSchema.index({ seller: 1, documentNumber: 1 }, { unique: true });
AuditSchema.index({ seller: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

AuditSchema.virtual('auditId').get(function () {
  return this._id?.toHexString();
});

AuditSchema.virtual('locationId').get(function () {
  return this.locationType === LocationType.SHOP ? this.shop : this.warehouse;
});

AuditSchema.virtual('progress').get(function () {
  if (this.totalItems === 0) return 0;
  return Math.round((this.countedItems / this.totalItems) * 100);
});

AuditSchema.virtual('hasDiscrepancies').get(function () {
  return this.discrepancyItems > 0;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type AuditDocument = HydratedDocument<Audit>;
export type AuditModel = Model<Audit>;
