import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class PlatformAccount extends Document {
  _id: Types.ObjectId;
  platformAccountId: string;
  createdAt: Date;
  updatedAt: Date;

  // ==== Агрегаты по балансу ====

  /**
   * Сумма всех поступлений на расчетный счет платформы (включая платежи клиентов, возвраты от поставщиков, штрафы и т.д.)
   */
  @Prop({ type: Number, default: 0 })
  totalInflow: number;

  /**
   * Сумма всех расходов с расчетного счета платформы (включая выплаты продавцам, оплату доставки, возвраты клиентам, комиссии банков и т.д.)
   */
  @Prop({ type: Number, default: 0 })
  totalOutflow: number;

  /**
   * Текущий остаток на расчетном счете платформы (включая замороженные и доступные суммы)
   * Формула: totalInflow - totalOutflow
   */
  @Prop({ type: Number, default: 0 })
  currentBalance: number;

  // ==== Денежные обязательства перед продавцами ====

  /**
   * Замороженные средства продавцов (деньги, которые пока не могут быть выведены продавцами, т.к. находятся в расчетных периодах/спорах/ожидают завершения заказа)
   */
  @Prop({ type: Number, default: 0 })
  frozenSellersFunds: number;

  /**
   * Доступные средства продавцов для вывода (только по закрытым и проверенным расчетным периодам)
   */
  @Prop({ type: Number, default: 0 })
  availableSellersFunds: number;

  /**
   * Сумма средств, находящихся в открытых/активных расчетных периодах у всех магазинов (пока не доступны для продавцов)
   */
  @Prop({ type: Number, default: 0 })
  inActiveSettlementPeriods: number;

  // ==== Доходы платформы ====

  /**
   * Общая прибыль платформы (комиссии с заказов, доходы от штрафов и других сервисных сборов)
   */
  @Prop({ type: Number, default: 0 })
  platformEarnings: number;

  /**
   * Общая сумма комиссии, удержанной платформой за все время (только комиссии, не включая штрафы и др. доходы)
   */
  @Prop({ type: Number, default: 0 })
  totalPlatformCommissions: number;

  /**
   * Общая сумма штрафов, поступивших в пользу платформы (может быть использовано для аналитики и оценки эффективности системы штрафов)
   */
  @Prop({ type: Number, default: 0 })
  totalPenaltyIncome: number;

  // ==== Доставка ====

  /**
   * Замороженные средства по доставке (деньги, поступившие от клиентов для оплаты доставки, но еще не перечисленные логистическому партнеру)
   */
  @Prop({ type: Number, default: 0 })
  frozenDeliveryFunds: number;

  /**
   * Сумма выплат логистическим/доставочным сервисам (Достависта и др.) за все время
   */
  @Prop({ type: Number, default: 0 })
  deliveryPayouts: number;

  // ==== Выплаты ====

  /**
   * Общая сумма средств, выведенных с платформы на счета продавцов
   */
  @Prop({ type: Number, default: 0 })
  totalPayoutsToSellers: number;

  // ==== Возвраты ====

  /**
   * Сумма возвратов, произведенных платформой клиентам (например, по отмененным/оспоренным заказам)
   */
  @Prop({ type: Number, default: 0 })
  totalRefundsToCustomers: number;

  // ==== Дополнительные возможные поля (по необходимости) ====

  /**
   * Сумма всех бонусов/акций, которые платформа выдавала за свой счет (если реализована бонусная система)
   */
  @Prop({ type: Number, default: 0 })
  totalBonusesIssued: number;

  /**
   * Сумма внешних поступлений (например, возвратов от логистических сервисов, компенсаций)
   */
  @Prop({ type: Number, default: 0 })
  totalExternalIncome: number;

  /**
   * Резерв на прочие расходы (например, резервирование средств на судебные/страховые выплаты)
   */
  @Prop({ type: Number, default: 0 })
  reserveFunds: number;

  /**
   * Сумма удержанных налогов (если платформа самостоятельно удерживает и перечисляет налоги за продавцов)
   */
  @Prop({ type: Number, default: 0 })
  totalWithheldTaxes: number;

  /**
   * Сумма комиссий банка и эквайринга (затраты платформы на прием платежей)
   */
  @Prop({ type: Number, default: 0 })
  totalBankFees: number;
}

export const PlatformAccountSchema = SchemaFactory.createForClass(PlatformAccount);
PlatformAccountSchema.plugin(mongooseLeanVirtuals as any);

PlatformAccountSchema.virtual('platformAccountId').get(function (this: PlatformAccount): string {
  return this._id.toString();
});