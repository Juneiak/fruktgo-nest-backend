import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { Shop } from 'src/modules/shop/shop.schema';
import { 
  StockMovementType, 
  StockMovementDocumentType, 
  StockMovementActorType,
  WriteOffReason,
} from './stock-movement.enums';


// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Ссылка на связанный документ
 */
@Schema({ _id: false })
export class StockMovementDocument {
  @Prop({ type: String, enum: Object.values(StockMovementDocumentType), required: true })
  type: StockMovementDocumentType;

  @Prop({ type: Types.ObjectId, required: true })
  id: Types.ObjectId;

  @Prop({ type: String })
  number?: string;
}
export const StockMovementDocumentSchema = SchemaFactory.createForClass(StockMovementDocument);


/**
 * Информация об акторе (кто совершил действие)
 */
@Schema({ _id: false })
export class StockMovementActor {
  @Prop({ type: String, enum: Object.values(StockMovementActorType), required: true })
  type: StockMovementActorType;

  @Prop({ type: Types.ObjectId })
  id?: Types.ObjectId;

  @Prop({ type: String })
  name?: string;
}
export const StockMovementActorSchema = SchemaFactory.createForClass(StockMovementActor);


// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class StockMovement {
  _id: Types.ObjectId;
  readonly stockMovementId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Тип движения */
  @Prop({ type: String, enum: Object.values(StockMovementType), required: true })
  type: StockMovementType;

  /** Товар в магазине */
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, required: true })
  shopProduct: Types.ObjectId;

  /** Магазин (денормализовано для быстрых запросов) */
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  /** Изменение количества (положительное или отрицательное) */
  @Prop({ type: Number, required: true })
  quantity: number;

  /** Остаток ДО операции */
  @Prop({ type: Number, required: true })
  balanceBefore: number;

  /** Остаток ПОСЛЕ операции */
  @Prop({ type: Number, required: true })
  balanceAfter: number;

  /** Связанный документ */
  @Prop({ type: StockMovementDocumentSchema })
  document?: StockMovementDocument;

  /** Кто совершил действие */
  @Prop({ type: StockMovementActorSchema, required: true })
  actor: StockMovementActor;

  /** Причина списания (только для type = WRITE_OFF) */
  @Prop({ type: String, enum: Object.values(WriteOffReason) })
  writeOffReason?: WriteOffReason;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
StockMovementSchema.plugin(mongooseLeanVirtuals as any);
StockMovementSchema.plugin(mongoosePaginate);

StockMovementSchema.virtual('stockMovementId').get(function (this: StockMovement): string {
  return this._id.toString();
});

// Индексы для быстрых запросов
StockMovementSchema.index({ shopProduct: 1, createdAt: -1 });
StockMovementSchema.index({ shop: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });
StockMovementSchema.index({ 'document.type': 1, 'document.id': 1 });

export type StockMovementDocument_ = HydratedDocument<StockMovement>;
export type StockMovementModel = PaginateModel<StockMovementDocument_>;
