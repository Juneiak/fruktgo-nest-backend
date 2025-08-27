import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum SettlementPeriodTransactionType {
  // Поступления денег
  ORDER_INCOME = 'order_income',           // Доход от заказа (становится доступным после окончания периода)
  BONUS = 'bonus',                         // Бонус от маркетплейса
  CORRECTION_IN = 'correction_in',         // Корректировка в пользу продавца

  // Списания денег
  PENALTY = 'penalty',                     // Штраф
  ORDER_REFUND = 'order_refund',           // Возврат по заказу
  PAYOUT = 'payout',                       // Перевод средств на SellerAccount (не прямой вывод)
  COMMISSION = 'commission',               // Комиссия маркетплейса
  DELIVERY_FEE = 'delivery_fee',           // Оплата за доставку (расход продавца)
  CORRECTION_OUT = 'correction_out',       // Корректировка не в пользу продавца
}

export enum SettlementPeriodTransactionStatus {
  PENDING = 'pending',       // В ожидании
  COMPLETED = 'completed',   // Выполнена
  FAILED = 'failed',         // Ошибка
  CANCELED = 'canceled',     // Отменена
};

export enum SettlementPeriodTransactionDirection {
  CREDIT = 'credit',      // Пополнение (поступление)
  DEBIT = 'debit'         // Списание (расход)
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class SettlementPeriodTransaction extends Document {

  _id: Types.ObjectId;
  shopTransactionId: string;
  createdAt: Date;
  updatedAt: Date;

  // Ссылка на расчетный период
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SettlementPeriod', required: true })
  settlementPeriod: Types.ObjectId;

  // Тип транзакции
  @Prop({ type: SchemaTypes.String, enum: Object.values(SettlementPeriodTransactionType), required: true })
  type: SettlementPeriodTransactionType;

  // Статус транзакции
  @Prop({ type: SchemaTypes.String, enum: Object.values(SettlementPeriodTransactionStatus), default: SettlementPeriodTransactionStatus.PENDING, required: true })
  status: SettlementPeriodTransactionStatus;

  // Кредит/Дебет (приход/расход)
  @Prop({ type: SchemaTypes.String, enum: ['credit', 'debit'], required: true })
  direction: SettlementPeriodTransactionDirection;

  // Сумма транзакции (всегда положительное число)
  @Prop({ type: SchemaTypes.Number, required: true })
  amount: number;

  // Описание транзакции
  @Prop({ type: SchemaTypes.String, required: true })
  description: string;

  // Комментарий к периоду (например, для ручных корректировок)
  @Prop({ type: SchemaTypes.String, default: null })
  internalComment: string;

  // Ссылки на связанные сущности
  @Prop({ type: Object, default: {} })
  references: {
    orderId?: string;             // ID заказа
    paymentId?: string;           // ID платежа
    refundId?: string;            // ID возврата
    penaltyId?: string;           // ID штрафа
    bonusId?: string;             // ID бонуса
    payoutId?: string;            // ID вывода
    deliveryPaymentId?: string;   // ID платежа за доставку (если внешняя интеграция)
    settlementPeriodTransactionId?: string; // ID транзакции расчетного периода
  };

  // Внешний идентификатор транзакции (если есть)
  @Prop({ type: SchemaTypes.String, default: null })
  externalTransactionId: string;
}

export const SettlementPeriodTransactionSchema = SchemaFactory.createForClass(SettlementPeriodTransaction);
SettlementPeriodTransactionSchema.plugin(mongooseLeanVirtuals as any);

SettlementPeriodTransactionSchema.virtual('settlementPeriodTransactionId').get(function (this: SettlementPeriodTransaction): string {
  return this._id.toString();
});