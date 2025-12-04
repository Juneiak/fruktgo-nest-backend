import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Shop } from 'src/modules/shop/shop.schema';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { Employee } from 'src/modules/employee/employee.schema';
import { WriteOffStatus, WriteOffReason } from './write-off.enums';


// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Позиция в акте списания
 */
@Schema({ _id: false })
export class WriteOffItem {
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, required: true })
  shopProduct: Types.ObjectId;

  /** Количество к списанию */
  @Prop({ type: Number, required: true, min: 0 })
  quantity: number;

  /** Причина списания для данной позиции */
  @Prop({ type: String, enum: Object.values(WriteOffReason), required: true })
  reason: WriteOffReason;

  /** Комментарий к позиции */
  @Prop({ type: String })
  comment?: string;

  /** Фото (доказательство) - URL изображений */
  @Prop({ type: [String], default: [] })
  photos: string[];
}
export const WriteOffItemSchema = SchemaFactory.createForClass(WriteOffItem);


// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

@Schema({
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

  /** Номер документа (генерируется автоматически) */
  @Prop({ type: String, required: true, unique: true })
  documentNumber: string;

  /** Магазин */
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  /** Статус документа */
  @Prop({ type: String, enum: Object.values(WriteOffStatus), default: WriteOffStatus.DRAFT })
  status: WriteOffStatus;

  /** Позиции списания */
  @Prop({ type: [WriteOffItemSchema], required: true })
  items: WriteOffItem[];

  /** Общая причина списания (основная) */
  @Prop({ type: String, enum: Object.values(WriteOffReason), required: true })
  reason: WriteOffReason;

  /** Общий комментарий */
  @Prop({ type: String })
  comment?: string;

  /** Кто создал документ */
  @Prop({ type: Types.ObjectId, ref: Employee.name, required: true })
  createdBy: Types.ObjectId;

  /** Кто подтвердил документ */
  @Prop({ type: Types.ObjectId, ref: Employee.name })
  confirmedBy?: Types.ObjectId;

  /** Дата подтверждения */
  @Prop({ type: Date })
  confirmedAt?: Date;
}

export const WriteOffSchema = SchemaFactory.createForClass(WriteOff);
WriteOffSchema.plugin(mongooseLeanVirtuals as any);
WriteOffSchema.plugin(mongoosePaginate);

WriteOffSchema.virtual('writeOffId').get(function (this: WriteOff): string {
  return this._id.toString();
});

// Индексы
WriteOffSchema.index({ shop: 1, createdAt: -1 });
WriteOffSchema.index({ documentNumber: 1 }, { unique: true });
WriteOffSchema.index({ status: 1, shop: 1 });

export type WriteOffDocument = HydratedDocument<WriteOff>;
export type WriteOffModel = PaginateModel<WriteOffDocument>;
