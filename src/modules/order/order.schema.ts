import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { PositiveFeedbackTag, NegativeFeedbackTag, EventActorType, OrderEventActorType } from './order.enums';
import { Shop } from 'src/modules/shop/shop.schema';
import { Image } from 'src/infra/images/image.schema';
import { ShopProduct } from '../shop-product/shop-product.schema';
import { Customer } from 'src/modules/customer/customer.schema';
import { Employee } from 'src/modules/employee/employee.schema';
import { Shift } from 'src/modules/shift/shift.schema';
import {
  OrderStatus,
  OrderCancelReason,
  OrderDeclineReason,
  OrderEventType
} from './order.enums';
import {
  ProductCategory,
  ProductMeasuringScale,
} from 'src/modules/product/product.enums';


// orderedBy (customer)
const OrderedBySchema = {
  _id: false,
  customer: { type: Types.ObjectId, ref: Customer.name, required: true },
  customerName: { type: String, required: true },
};
export interface OrderedBy {
  customer: Types.ObjectId;
  customerName: string;
}

// orderedFrom (shop)
const OrderedFromSchema = {
  _id: false,
  shop: { type: Types.ObjectId, ref: Shop.name, required: true },
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
  employee: { type: Types.ObjectId, ref: Employee.name, default: null },
  employeeName: { type: String, default: null },
  shift: { type: Types.ObjectId, ref: Shift.name, default: null },
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

// Order Event (Event Sourcing)
const OrderEventSchema = {
  type: { type: String, enum: Object.values(OrderEventType), required: true },
  timestamp: { type: Date, required: true, default: () => new Date() },
  actor: {
    type: { type: String, enum: Object.values(OrderEventActorType), required: true },
    id: { type: Types.ObjectId, required: true },
    name: { type: String, required: false }
  },
  data: { type: Object, required: false }, // Дополнительные данные события
  metadata: { type: Object, required: false }, // Метаданные (например, IP, user-agent)
  _id: true // Оставляем _id для событий для уникальности
};

export interface OrderEventActor {
  type?: OrderEventActorType;
  id?: Types.ObjectId;
  name?: string;
}

export interface OrderEvent {
  _id: Types.ObjectId;
  type: OrderEventType;
  timestamp: Date;
  actor?: OrderEventActor;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
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
  shopProduct: { type: Types.ObjectId, ref: ShopProduct.name, required: true },
  category: { type: String, enum: Object.values(ProductCategory), required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  cardImage: { type: Types.ObjectId, ref: Image.name, required: false },
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

  @Prop({ type: Types.ObjectId, ref: Shift.name, required: true })
  shift: Types.ObjectId;

  @Prop({ type: Date, required: true })
  orderedAt: Date;

  @Prop({ type: String, default: null })
  customerComment: string | null;

  // Events (Event Sourcing)
  @Prop({ type: [OrderEventSchema], default: [] })
  events: OrderEvent[];

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
