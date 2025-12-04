import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { InventoryAuditStatus, InventoryAuditType } from './inventory-audit.enums';

// ═══════════════════════════════════════════════════════════════
// INVENTORY AUDIT ITEM (Embedded)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class InventoryAuditItem {
  @Prop({ type: Types.ObjectId, required: true })
  shopProduct: Types.ObjectId;

  /** Ожидаемое количество (из системы на момент начала) */
  @Prop({ type: Number, min: 0, required: true })
  expectedQuantity: number;

  /** Фактическое количество (после пересчёта) */
  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  /** Разница (actualQuantity - expectedQuantity) */
  @Prop({ type: Number })
  difference?: number;

  /** Отметка о подсчёте */
  @Prop({ type: Boolean, default: false })
  isCounted: boolean;

  /** Комментарий по позиции */
  @Prop({ type: String })
  comment?: string;
}

export const InventoryAuditItemSchema = SchemaFactory.createForClass(InventoryAuditItem);

// ═══════════════════════════════════════════════════════════════
// INVENTORY AUDIT
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class InventoryAudit {
  _id: Types.ObjectId;
  readonly inventoryAuditId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Номер документа (IA-YYYYMMDD-XXXX) */
  @Prop({ type: String, required: true, unique: true })
  documentNumber: string;

  /** Магазин */
  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;

  /** Статус документа */
  @Prop({ 
    type: String, 
    enum: Object.values(InventoryAuditStatus), 
    default: InventoryAuditStatus.DRAFT, 
    required: true 
  })
  status: InventoryAuditStatus;

  /** Тип инвентаризации */
  @Prop({ 
    type: String, 
    enum: Object.values(InventoryAuditType), 
    default: InventoryAuditType.PARTIAL, 
    required: true 
  })
  type: InventoryAuditType;

  /** Позиции */
  @Prop({ type: [InventoryAuditItemSchema], default: [] })
  items: InventoryAuditItem[];

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;

  /** Кто создал документ */
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  createdBy: Types.ObjectId;

  /** Кто начал подсчёт */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  startedBy?: Types.ObjectId;

  /** Дата начала подсчёта */
  @Prop({ type: Date })
  startedAt?: Date;

  /** Кто завершил */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  completedBy?: Types.ObjectId;

  /** Дата завершения */
  @Prop({ type: Date })
  completedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY (Вычисляется при завершении)
  // ═══════════════════════════════════════════════════════════════

  /** Общее количество позиций */
  @Prop({ type: Number, default: 0 })
  totalItems: number;

  /** Количество подсчитанных позиций */
  @Prop({ type: Number, default: 0 })
  countedItems: number;

  /** Позиций с излишками */
  @Prop({ type: Number, default: 0 })
  surplusItems: number;

  /** Позиций с недостачей */
  @Prop({ type: Number, default: 0 })
  shortageItems: number;

  /** Позиций без расхождений */
  @Prop({ type: Number, default: 0 })
  matchedItems: number;
}

export const InventoryAuditSchema = SchemaFactory.createForClass(InventoryAudit);
InventoryAuditSchema.plugin(mongooseLeanVirtuals as any);
InventoryAuditSchema.plugin(mongoosePaginate);

InventoryAuditSchema.virtual('inventoryAuditId').get(function (this: InventoryAudit): string {
  return this._id.toString();
});

// Индексы
InventoryAuditSchema.index({ shop: 1, status: 1 });
InventoryAuditSchema.index({ documentNumber: 1 });
InventoryAuditSchema.index({ createdAt: -1 });

export type InventoryAuditDocument = HydratedDocument<InventoryAudit>;
export type InventoryAuditModel = PaginateModel<InventoryAuditDocument>;
