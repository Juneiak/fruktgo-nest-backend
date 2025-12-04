import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Shop } from 'src/modules/shop/shop.schema';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { Employee } from 'src/modules/employee/employee.schema';
import { ReceivingStatus, ReceivingType } from './receiving.enums';


// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Позиция в документе приёмки
 */
@Schema({ _id: false })
export class ReceivingItem {
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, required: true })
  shopProduct: Types.ObjectId;

  /** Количество по документу (ожидаемое) */
  @Prop({ type: Number, required: true, min: 0 })
  expectedQuantity: number;

  /** Фактически принятое количество */
  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  /** Комментарий к позиции */
  @Prop({ type: String })
  comment?: string;
}
export const ReceivingItemSchema = SchemaFactory.createForClass(ReceivingItem);


// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Receiving {
  _id: Types.ObjectId;
  readonly receivingId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Номер документа (генерируется автоматически) */
  @Prop({ type: String, required: true, unique: true })
  documentNumber: string;

  /** Магазин */
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  /** Статус документа */
  @Prop({ type: String, enum: Object.values(ReceivingStatus), default: ReceivingStatus.DRAFT })
  status: ReceivingStatus;

  /** Тип поставки */
  @Prop({ type: String, enum: Object.values(ReceivingType), required: true })
  type: ReceivingType;

  /** Позиции приёмки */
  @Prop({ type: [ReceivingItemSchema], required: true })
  items: ReceivingItem[];

  /** Поставщик (название или ID) */
  @Prop({ type: String })
  supplier?: string;

  /** Номер накладной поставщика */
  @Prop({ type: String })
  supplierInvoice?: string;

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

export const ReceivingSchema = SchemaFactory.createForClass(Receiving);
ReceivingSchema.plugin(mongooseLeanVirtuals as any);
ReceivingSchema.plugin(mongoosePaginate);

ReceivingSchema.virtual('receivingId').get(function (this: Receiving): string {
  return this._id.toString();
});

// Индексы
ReceivingSchema.index({ shop: 1, createdAt: -1 });
ReceivingSchema.index({ documentNumber: 1 }, { unique: true });
ReceivingSchema.index({ status: 1, shop: 1 });

export type ReceivingDocument = HydratedDocument<Receiving>;
export type ReceivingModel = PaginateModel<ReceivingDocument>;
