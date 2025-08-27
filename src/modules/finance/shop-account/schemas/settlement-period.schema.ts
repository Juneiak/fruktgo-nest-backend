import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

const SettlementPeriodAmountsSchema = {
  orderPayments: { type: Number, default: 0 },
  orderCompletions: { type: Number, default: 0 },
  refunds: { type: Number, default: 0 },
  penalties: { type: Number, default: 0 },
  commissions: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  correctionsIn: { type: Number, default: 0 },
  correctionsOut: { type: Number, default: 0 },
};

export interface SettlementPeriodAmounts {
  orderPayments: number;
  orderCompletions: number;
  refunds: number;
  penalties: number;
  commissions: number;
  bonus: number;
  correctionsIn: number;
  correctionsOut: number;
  total?: number; // Общая сумма всех транзакций в периоде
}

export enum SettlementPeriodStatus {
  ACTIVE = 'active',
  PENDING_APPROVAL = 'pending_approval',
  RELEASED = 'released'
}

@Schema({ 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class SettlementPeriod extends Document {
  
  _id: Types.ObjectId;
  settlementPeriodId: string;
  createdAt: Date;
  updatedAt: Date;

  // Ссылка на счет магазина
  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'ShopAccount' })
  shopAccount: Types.ObjectId;

  // Порядковый номер периода для данной магазина
  @Prop({ required: true, type: SchemaTypes.Number})
  periodNumber: number;
  
  // Дата начала периода
  @Prop({ required: true, type: SchemaTypes.Date })
  startDate: Date;
  
  // Дата окончания периода (сбора транзакций)
  @Prop({ type: SchemaTypes.Date, required: true, })
  endDate: Date;

  @Prop({ type: SchemaTypes.Date, default: null, })
  closedAt: Date;

  // Дата фактического одобрения и разморозки периода
  @Prop({ type: SchemaTypes.Date })
  releasedAt: Date;

  // Сумма, которая была размарожена и доступна для вывода
  @Prop({ default: 0, type: SchemaTypes.Number })
  releasedAmount: number;
  
  // Статус периода
  @Prop({ type: SchemaTypes.String, enum: Object.values(SettlementPeriodStatus), default: SettlementPeriodStatus.ACTIVE })
  status: SettlementPeriodStatus;
  
  // Суммы по типам транзакций
  @Prop({ type: SettlementPeriodAmountsSchema, required: true })
  amounts: SettlementPeriodAmounts;
  
  // Итоговая сумма к выплате за период (с учетом всех вычетов)
  @Prop({ type: SchemaTypes.Number, default: 0,  })
  totalAmount: number;
  
  // Комментарий к периоду (например, для ручных корректировок)
  @Prop({ type: SchemaTypes.String, default: null })
  internalComment: string;
  
  // Длительность периода в днях
  @Prop({ required: true, type: SchemaTypes.Number })
  periodDurationDays: number;
  
  transactions: any[];

  penalties: any[];
}

export const SettlementPeriodSchema = SchemaFactory.createForClass(SettlementPeriod);
SettlementPeriodSchema.plugin(mongooseLeanVirtuals as any);

SettlementPeriodSchema.virtual('settlementPeriodId').get(function (this: SettlementPeriod): string {
  return this._id.toString();
});

SettlementPeriodSchema.virtual('transactions', {
  ref: 'ShopTransaction',
  localField: '_id',
  foreignField: 'settlementPeriod',
  justOne: false
});


SettlementPeriodSchema.virtual('penalties', {
  ref: 'Penalty',
  localField: '_id',
  foreignField: 'settlementPeriod',
  justOne: false
});
  