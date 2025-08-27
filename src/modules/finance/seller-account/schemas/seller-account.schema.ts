import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types } from "mongoose";
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum SellerAccountStatus {
  ACTIVE = 'active',            // Активный счет
  BLOCKED = 'blocked',          // Заблокированный счет
  SUSPENDED = 'suspended',      // Временно приостановлен
}

@Schema({ 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class SellerAccount extends Document {
  _id: Types.ObjectId;
  sellerAccountId: string;
  createdAt: Date;
  updatedAt: Date;

  // Связь с продавцом
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Seller', required: true, unique: true })
  seller: Types.ObjectId;

  // Баланс аккаунта (доступная сумма для вывода)
  @Prop({ type: SchemaTypes.Number, default: 0 })
  balance: number;

  // Общая сумма выведенных средств за все время
  @Prop({ type: SchemaTypes.Number, default: 0 })
  totalWithdrawnAmount: number;
  
  // Банковские реквизиты для вывода средств
  @Prop({ type: SchemaTypes.Mixed, default: {} })
  bankDetails: {
    accountNumber?: string;     // Номер счета
    bankName?: string;          // Название банка
    bik?: string;               // БИК
    correspondentAccount?: string; // Корреспондентский счет
    accountHolder?: string;     // Держатель счета
    inn?: string;               // ИНН
  };

  // Статус аккаунта
  @Prop({ type: SchemaTypes.String, enum: Object.values(SellerAccountStatus), default: SellerAccountStatus.ACTIVE })
  status: SellerAccountStatus;
  
  // Причина текущего статуса (например, причина блокировки)
  @Prop({ type: SchemaTypes.String })
  statusReason: string;
}

export const SellerAccountSchema = SchemaFactory.createForClass(SellerAccount);
SellerAccountSchema.plugin(mongooseLeanVirtuals as any);

SellerAccountSchema.virtual('sellerAccountId').get(function (this: SellerAccount): string {
  return this._id.toString();
});
