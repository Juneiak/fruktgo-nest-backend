import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  ReturnType,
  ReturnStatus,
  ItemCondition,
  ReturnItemDecision,
  CustomerReturnReason,
  DeliveryReturnReason,
  SupplierReturnReason,
} from './return.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция возврата
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ReturnItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, required: true })
  batch: Types.ObjectId;

  /** Product ID (денормализация) */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  /** Количество */
  @Prop({ type: Number, required: true, min: 0.001 })
  quantity: number;

  /** Время вне контролируемых условий (минуты) */
  @Prop({ type: Number, min: 0, default: 0 })
  minutesOutOfControl: number;

  /** Оценка состояния */
  @Prop({ type: String, enum: Object.values(ItemCondition) })
  condition?: ItemCondition;

  /** Решение по позиции */
  @Prop({ type: String, enum: Object.values(ReturnItemDecision) })
  decision?: ReturnItemDecision;

  /** Скидка % (если RETURN_WITH_DISCOUNT) */
  @Prop({ type: Number, min: 0, max: 100 })
  discountPercent?: number;

  /** Пересчитанный срок годности */
  @Prop({ type: Date })
  newEffectiveExpiration?: Date;

  /** Пересчитанная свежесть */
  @Prop({ type: Number, min: 0, max: 10 })
  newFreshnessRemaining?: number;

  /** Закупочная цена (для расчёта потерь) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** Комментарий к позиции */
  @Prop({ type: String })
  comment?: string;

  /** Фото товара при осмотре */
  @Prop({ type: [String], default: [] })
  photos: string[];

  /** ID созданного WriteOff (если decision = WRITE_OFF) */
  @Prop({ type: Types.ObjectId })
  createdWriteOffId?: Types.ObjectId;
}

export const ReturnItemSchema = SchemaFactory.createForClass(ReturnItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА RETURN
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_returns',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Return {
  _id: Types.ObjectId;
  readonly returnId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ДОКУМЕНТ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String, required: true, index: true })
  documentNumber: string;

  @Prop({
    type: String,
    enum: Object.values(ReturnType),
    required: true,
    index: true,
  })
  type: ReturnType;

  @Prop({
    type: String,
    enum: Object.values(ReturnStatus),
    default: ReturnStatus.PENDING_INSPECTION,
    index: true,
  })
  status: ReturnStatus;

  // ═══════════════════════════════════════════════════════════════
  // ЛОКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  warehouse?: Types.ObjectId;

  @Prop({ type: String })
  locationName?: string;

  // ═══════════════════════════════════════════════════════════════
  // СВЯЗИ
  // ═══════════════════════════════════════════════════════════════

  /** Связанный заказ (для CUSTOMER_RETURN, DELIVERY_RETURN) */
  @Prop({ type: Types.ObjectId, index: true })
  order?: Types.ObjectId;

  /** Связанная приёмка (для SUPPLIER_RETURN) */
  @Prop({ type: Types.ObjectId })
  receiving?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ПРИЧИНА
  // ═══════════════════════════════════════════════════════════════

  /** Причина возврата от клиента */
  @Prop({ type: String, enum: Object.values(CustomerReturnReason) })
  customerReturnReason?: CustomerReturnReason;

  /** Причина возврата курьером */
  @Prop({ type: String, enum: Object.values(DeliveryReturnReason) })
  deliveryReturnReason?: DeliveryReturnReason;

  /** Причина возврата поставщику */
  @Prop({ type: String, enum: Object.values(SupplierReturnReason) })
  supplierReturnReason?: SupplierReturnReason;

  // ═══════════════════════════════════════════════════════════════
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [ReturnItemSchema], required: true, default: [] })
  items: ReturnItem[];

  // ═══════════════════════════════════════════════════════════════
  // СУММЫ
  // ═══════════════════════════════════════════════════════════════

  /** Общая сумма возврата (по закупочным ценам) */
  @Prop({ type: Number, min: 0, default: 0 })
  totalValue: number;

  /** Сумма списанного */
  @Prop({ type: Number, min: 0, default: 0 })
  totalLoss: number;

  /** Сумма возвращённого на полку */
  @Prop({ type: Number, min: 0, default: 0 })
  totalReturnedToShelf: number;

  // ═══════════════════════════════════════════════════════════════
  // УЧАСТНИКИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  inspectedBy?: Types.ObjectId;

  @Prop({ type: Date })
  inspectedAt?: Date;

  @Prop({ type: Types.ObjectId })
  completedBy?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIER RETURN SPECIFIC
  // ═══════════════════════════════════════════════════════════════

  /** Поставщик (для SUPPLIER_RETURN) */
  @Prop({ type: String })
  supplier?: string;

  /** Ответ поставщика */
  @Prop({ type: String })
  supplierResponse?: string;

  /** Дата ответа поставщика */
  @Prop({ type: Date })
  supplierRespondedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;

  /** Фото при возврате */
  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const ReturnSchema = SchemaFactory.createForClass(Return);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

ReturnSchema.index({ seller: 1, status: 1 });
ReturnSchema.index({ seller: 1, type: 1 });
ReturnSchema.index({ seller: 1, documentNumber: 1 }, { unique: true });
ReturnSchema.index({ seller: 1, createdAt: -1 });
ReturnSchema.index({ order: 1 }, { sparse: true });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

ReturnSchema.virtual('returnId').get(function () {
  return this._id?.toHexString();
});

ReturnSchema.virtual('locationId').get(function () {
  return this.locationType === LocationType.SHOP ? this.shop : this.warehouse;
});

ReturnSchema.virtual('itemsCount').get(function () {
  return this.items?.length || 0;
});

/** Причина (универсальный геттер) */
ReturnSchema.virtual('reason').get(function () {
  switch (this.type) {
    case ReturnType.CUSTOMER_RETURN:
      return this.customerReturnReason;
    case ReturnType.DELIVERY_RETURN:
      return this.deliveryReturnReason;
    case ReturnType.SUPPLIER_RETURN:
      return this.supplierReturnReason;
    default:
      return null;
  }
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type ReturnDocument = HydratedDocument<Return>;
export type ReturnModel = Model<Return>;
