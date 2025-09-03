import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ProductCategory, ProductMeasuringScale } from 'src/modules/product/product.schema';

export enum OrderStatus {
  PENDING='pending',
  PREPARING='preparing',
  AWAITING_COURIER='awaitingCourier',
  DELIVERING='delivering',
  DELIVERED='delivered',
  CANCELLED='cancelled',
  DECLINED='declined',
  FAILED='failed',
}

export const ORDER_STATUS_DISPLAY_MAP: Record<string, string> = {
  [OrderStatus.PENDING]: '🕒 Новый',
  [OrderStatus.PREPARING]: '🍏 Готовится',
  [OrderStatus.AWAITING_COURIER]: '🚚 Ожидает курьера',
  [OrderStatus.DELIVERING]: '🚚 Доставляется',
  [OrderStatus.DELIVERED]: '✅ Доставлен',
  [OrderStatus.CANCELLED]: '❌ Отменён',
  [OrderStatus.DECLINED]: '❌ Отклонён',
  [OrderStatus.FAILED]: '❌ Провалилась',
};


export enum PositiveFeedbackTag {
  GOOD_QUALITY = 'goodQuality',
  FRESH_PRODUCTS = 'freshProducts',
  FAST_DELIVERY = 'fastDelivery',
  GOOD_COMMUNICATION = 'goodCommunication',
  GOOD_PRICE = 'goodPrice'
}

export enum NegativeFeedbackTag {
  DELAYED_DELIVERY = 'delayedDelivery', 
  LOW_QUALITY = 'lowQuality',
  DAMAGED_PACKAGING = 'damagedPackaging',
  WRONG_ITEMS = 'wrongItems',
  HIGH_PRICE = 'highPrice'
}

export enum OrderDeclineReason {
  OUT_OF_STOCK = 'outOfStock',             // Товар закончился на складе
  CLOSED_SHOP = 'closedShop',              // Магазин закрыт (внеплановое закрытие)
  PRICE_CHANGED = 'priceChanged',          // Изменились цены
  QUALITY_ISSUES = 'qualityIssues',        // Проблемы с качеством товара
  INSUFFICIENT_QUANTITY = 'insufficientQuantity', // Недостаточное количество товара
  TECHNICAL_ISSUES = 'technicalIssues',    // Технические проблемы
  WRONG_PRICE = 'wrongPrice',              // Неверная цена в системе
  TEMPORARILY_UNAVAILABLE = 'temporarilyUnavailable', // Товар временно недоступен
  OTHER = 'other'                          // Другая причина (требует комментария)
}

export enum OrderCancelReason {
  CHANGED_MIND = 'changedMind',             // Передумал
  DUPLICATE_ORDER = 'duplicateOrder',       // Дублирующий заказ
  LONG_DELIVERY_TIME = 'longDeliveryTime',  // Долгое время доставки
  DELIVERY_ISSUES = 'deliveryIssues',       // Проблемы с доставкой
  PAYMENT_ISSUES = 'paymentIssues',         // Проблемы с оплатой
  PRICE_TOO_HIGH = 'priceTooHigh',          // Слишком высокая цена
  FOUND_BETTER_OFFER = 'foundBetterOffer',  // Нашел лучшее предложение
  UNAVAILABLE_DELIVERY_TIME = 'unavailableDeliveryTime', // Неподходящее время доставки
  ORDERED_BY_MISTAKE = 'orderedByMistake',  // Ошибочный заказ
  SELECTED_WRONG_ITEMS = 'selectedWrongItems', // Выбраны неверные товары
  OTHER = 'other'                           // Другая причина (требует комментария)
}

// orderedBy (customer)
const OrderedBySchema = {
  _id: false,
  customer: { type: Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
};
export interface OrderedBy {
  customer: Types.ObjectId;
  customerName: string;
}

// orderedFrom (shop)
const OrderedFromSchema = {
  _id: false,
  shop: { type: Types.ObjectId, ref: 'Shop', required: true },
  shopName: { type: String, required: true },
  shopImage: { type: String, required: true },
};
export interface OrderedFrom {
  shop: Types.ObjectId;
  shopName: string;
  shopImage: string;
}

// HandledBy (employee)
const HandledBySchema = {
  _id: false,
  employee: { type: Types.ObjectId, ref: 'Employee', required: false, default: null },
  employeeName: { type: String, required: false, default: null },
  shift: { type: Types.ObjectId, ref: 'Shift', required: false, default: null },
};
export interface HandledBy {
  employee: Types.ObjectId | null;
  employeeName: string | null;
  shift: Types.ObjectId | null;
}


// finance
const OrderFinancesSchema = {
  totalCartSum: { type: Number, required: true, default: 0, min: 0 },
  sentSum: { type: Number, required: true, default: 0, min: 0 },
  deliveryPrice: { type: Number, required: true, default: 0, min: 0 },
  systemTax: { type: Number, required: true, default: 0, min: 0 },
  usedBonusPoints: { type: Number, required: false, default: 0 },
  totalWeightCompensationBonus: { type: Number, required: false, default: 0 },
  totalSum: { type: Number, required: true, default: 0, min: 0 },
  _id: false
};
export interface OrderFinances {
  totalCartSum: number;
  sentSum: number;
  deliveryPrice: number;
  systemTax: number;
  usedBonusPoints: number;
  totalWeightCompensationBonus: number;
  totalSum: number;
};

// rating
const OrderRatingSchema = {
  settedRating: { type: Number, default: 0, min: 0, max: 5 },
  feedbackAt: { type: Date, default: null },
  feedbackTags: [{ type: String, enum: [...Object.values(PositiveFeedbackTag), ...Object.values(NegativeFeedbackTag)], default: [] }],
  feedbackComment: { type: String, default: '' },
  _id: false
};
export interface OrderRating {
  settedRating: number;
  feedbackAt: Date | null;
  feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];
  feedbackComment: string;
}

// delivery
const OrderDeliverySchema = {
  deliveryAddress: { type: String, required: true, default: '' },
  deliveryPrice: { type: Number, required: true, min: 0, default: 0 },
  deliveryTime: { type: Number, required: true, min: 0, default: 0 },
  _id: false
};
export interface OrderDelivery {
  deliveryAddress: string;
  deliveryPrice: number;
  deliveryTime: number;
}

// order product
const OrderProductSchema = {
  shopProduct: { type: Types.ObjectId, ref: 'ShopProduct', required: true },
  category: { type: String, enum: Object.values(ProductCategory), required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  cardImage: { type: Types.ObjectId, ref: 'UploadedFile', required: false },
  measuringScale: { type: String, enum: Object.values(ProductMeasuringScale), required: true },
  selectedQuantity: { type: Number, required: true, min: 0 },
  actualQuantity: { type: Number, min: 0, required: false, default: null },
  weightCompensationBonus: { type: Number, min: 0, required: false, default: 0 },
  _id: false
};
export interface OrderProduct {
  shopProduct: Types.ObjectId;
  category: ProductCategory;
  productName: string;
  price: number;
  cardImage: Types.ObjectId | null;
  measuringScale: ProductMeasuringScale;
  selectedQuantity: number;
  actualQuantity: number | null;
  weightCompensationBonus: number;
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Order {

  _id: Types.ObjectId;
  // virtuals (TS-объявления)
  readonly orderId?: string;

  @Prop({ type: OrderedFromSchema, required: true })
  orderedFrom: OrderedFrom;

  @Prop({ type: OrderedBySchema, required: true })
  orderedBy: OrderedBy;

  @Prop({ type: String, enum: Object.values(OrderStatus), required: true, default: OrderStatus.PENDING })
  orderStatus: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  shift: Types.ObjectId;

  @Prop({ type: Date, required: true })
  orderedAt: Date;

  @Prop({ type: Date, required: false, default: null })
  acceptedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  assembledAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  courierCalledAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  handedToCourierAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  deliveredAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  canceledAt: Date | null;

  @Prop({ type: String, enum: OrderCancelReason, required: false, default: null })
  canceledReason: OrderCancelReason | null;

  @Prop({ type: String, required: false, default: null })
  canceledComment: string | null;

  @Prop({ type: Date, required: false, default: null })
  declinedAt: Date | null;

  @Prop({ type: String, enum: OrderDeclineReason, required: false, default: null })
  declinedReason: OrderDeclineReason | null;

  @Prop({ type: String, required: false, default: null })
  declinedComment: string | null;

  @Prop({ type: String, required: false, default: null })
  customerComment: string | null;

  @Prop({ type: HandledBySchema, required: false, default: null })
  handledBy: HandledBy | null;

  // delivery
  @Prop({ required: true, type: OrderDeliverySchema })
  delivery: OrderDelivery;

  // finances
  @Prop({  type: OrderFinancesSchema, required: true })
  finances: OrderFinances;

  // rating
  @Prop({ required: false, type: OrderRatingSchema })
  rating: OrderRating;

  // products
  @Prop({ type: [OrderProductSchema], required: true, default: [] })
  products: OrderProduct[]

};


export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.plugin(mongooseLeanVirtuals as any);
OrderSchema.plugin(mongoosePaginate);

OrderSchema.virtual('orderId').get(function (this: Order): string {
  return this._id.toString();
});

export type OrderDocument = HydratedDocument<Order>;
export type OrderModel = PaginateModel<OrderDocument>;
