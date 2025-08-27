import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum PlatformAccountTransactionType {
  // Поступления денег
  ACQUIRING_INCOME = 'acquiring_income',       // Приём денег от клиента (эквайринг)
  COMMISSION_INCOME = 'commission_income',     // Комиссия маркетплейса (доход)
  SELLER_PAYOUT_RETURN = 'seller_payout_return', // Возврат средств от продавца (например, возврат, штраф)
  CORRECTION_IN = 'correction_in',             // Корректировка вручную (приход)

  // Списания денег
  SELLER_PAYOUT = 'seller_payout',             // Выплата продавцу
  DELIVERY_PAYMENT = 'delivery_payment',       // Оплата доставки стороннему сервису
  REFUND_TO_CUSTOMER = 'refund_to_customer',   // Возврат клиенту
  BONUS_TO_SELLER = 'bonus_to_seller',         // Бонус продавцу (расход платформы)
  OPERATIONAL_EXPENSE = 'operational_expense', // Операционный расход (аренда, комиссия банка и т.п.)
  CORRECTION_OUT = 'correction_out',           // Корректировка вручную (расход)
}

export enum PlatformAccountTransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
};

export enum PlatformAccountTransactionDirection {
  CREDIT = 'credit',   // Приход (увеличение баланса)
  DEBIT = 'debit',     // Расход (уменьшение баланса)
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class PlatformAccountTransaction extends Document {
  _id: Types.ObjectId;
  platformAccountTransactionId: string;
  createdAt: Date;
  updatedAt: Date;

  // Ссылка на платформенный счет (MarketplaceAccount)
  @Prop({ type: SchemaTypes.ObjectId, ref: 'PlatformAccount', required: true })
  platformAccount: Types.ObjectId;

  // Тип транзакции
  @Prop({ type: SchemaTypes.String, enum: Object.values(PlatformAccountTransactionType), required: true })
  type: PlatformAccountTransactionType;

  // Статус транзакции
  @Prop({ type: SchemaTypes.String, enum: Object.values(PlatformAccountTransactionStatus), default: PlatformAccountTransactionStatus.PENDING, required: true })
  status: PlatformAccountTransactionStatus;

  // Сумма (всегда положительная)
  @Prop({ type: SchemaTypes.Number, required: true })
  amount: number;

  // CREDIT / DEBIT (приход / расход)
  @Prop({ type: SchemaTypes.String, enum: Object.values(PlatformAccountTransactionDirection), required: true })
  direction: PlatformAccountTransactionDirection;

  // Описание транзакции
  @Prop({ type: SchemaTypes.String, default: null })
  description: string | null;

  // Комментарий к периоду (например, для ручных корректировок)
  @Prop({ type: SchemaTypes.String, default: null })
  internalComment: string;

  @Prop({ type: Boolean, default: false })
  isManual: boolean;

  // Ссылки на связанные сущности (гибко, под любой кейс)
  @Prop({ type: Object, default: {} })
  references: {
    orderId?: string;
    customerId?: string;
    employeeId?: string;
    sellerAccountId?: string;
    shopAccountId?: string;
    paymentId?: string;
    refundId?: string;
    penaltyId?: string;
    withdrawalRequestId?: string;
    deliveryPaymentId?: string;
    externalServiceId?: string; // id внешней транзакции/платежки
    platformAccountTransactionId?: string;
  };

  // Внешний идентификатор транзакции (например, номер платежа банка)
  @Prop({ type: SchemaTypes.String, default: null })
  externalTransactionId: string | null;
}

export const PlatformAccountTransactionSchema = SchemaFactory.createForClass(PlatformAccountTransaction);
PlatformAccountTransactionSchema.plugin(mongooseLeanVirtuals as any);

PlatformAccountTransactionSchema.virtual('platformAccountTransactionId').get(function (this: PlatformAccountTransaction): string {
  return this._id.toString();
});
