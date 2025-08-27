import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types  } from "mongoose";
import * as mongooseLeanVirtuals from "mongoose-lean-virtuals";

export enum AccountStatus {
  ACTIVE = 'active',            // Активный счет
  SUSPENDED = 'suspended',      // Временно приостановлен
};

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class ShopAccount extends Document {

  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  shopAccountId: string;

  // Связь с магазином
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;

  // Связь с аккаунтом продавца (SellerAccount)
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SellerAccount', required: true })
  sellerAccount: Types.ObjectId;

  // Ссылка на текущий расчетный период
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SettlementPeriod', default: null })
  currentSettlementPeriod: Types.ObjectId | null;
  
  // Всего заработано за все время
  @Prop({ type: SchemaTypes.Number, default: 0 })
  lifetimeEarnings: number;

  // Всего штрафов
  @Prop({ type: SchemaTypes.Number, default: 0 })
  totalPenalties: number;

  // Всего комиссий
  @Prop({ type: SchemaTypes.Number, default: 0 })
  totalCommissions: number;

  // Статус счета
  @Prop({ type: SchemaTypes.String, enum: Object.values(AccountStatus), default: AccountStatus.ACTIVE })
  status: AccountStatus;

  // Расчетный период для заморозки средств (в днях), для новых периодов
  @Prop({ type: SchemaTypes.Number, default: 14 })
  freezePeriodDays: number;

  // Процент комиссии
  @Prop({ type: SchemaTypes.Number, default: 10 })
  commissionPercent: number;

  // Внутренний комментарий
  @Prop({ type: SchemaTypes.String })
  internalComment: string;
}

export const ShopAccountSchema = SchemaFactory.createForClass(ShopAccount);
ShopAccountSchema.plugin(mongooseLeanVirtuals as any);

ShopAccountSchema.virtual('shopAccountId').get(function (this: ShopAccount): string {
  return this._id.toString();
});