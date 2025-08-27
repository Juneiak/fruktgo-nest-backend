import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum PenaltyStatus {
  CREATED = 'created',          // Создан
  CONTESTED = 'contested',      // Оспаривается
  CONFIRMED = 'confirmed',      // Подтвержден
  CANCELED = 'canceled',        // Отменен
}

export enum PenaltyReason {
  ORDER_DELAY = 'order_delay',              // Задержка заказа
  PRODUCT_QUALITY = 'product_quality',      // Качество товара
  PRODUCT_MISMATCH = 'product_mismatch',    // Несоответствие товара описанию
  RULE_VIOLATION = 'rule_violation',        // Нарушение правил платформы
  OTHER = 'other',                          // Другое
}

@Schema({timestamps: true})
export class Penalty extends Document {
  _id: Types.ObjectId;
  penaltyId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'ShopAccount' })
  shopAccount: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.Number })
  amount: number;

  @Prop({ required: true, type: SchemaTypes.String, enum: Object.values(PenaltyReason)})
  reason: PenaltyReason;

  @Prop({ required: true, type: SchemaTypes.String })
  description: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'SettlementPeriod', default: null })
  settlementPeriod: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: Object.values(PenaltyStatus), default: PenaltyStatus.CREATED })
  status: PenaltyStatus;

  @Prop({ type: SchemaTypes.String, default: null })
  sellerConsest: string | null;

  @Prop({ type: SchemaTypes.Date, default: null })
  sellerConsestDate: Date | null;

  @Prop({ type: SchemaTypes.String, default: null })
  adminDecision: string | null;

  @Prop({ type: SchemaTypes.Date, default: null })
  adminDecisionDate: Date | null;

  // Ссылки на связанные сущности
  @Prop({ type: Object, default: {} })
  references: {
    orderId?: string;           // ID заказа, если штраф связан с заказом
    transactionId?: string;     // ID транзакции после создания
  };
}

export const PenaltySchema = SchemaFactory.createForClass(Penalty);
PenaltySchema.plugin(mongooseLeanVirtuals as any);

PenaltySchema.virtual('penaltyId').get(function (this: Penalty): string {
  return this._id.toString();
});

