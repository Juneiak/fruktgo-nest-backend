import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { PositiveFeedbackTag, NegativeFeedbackTag, OrderEventActorType } from './order.enums';
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

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class OrderedBy {
  @Prop({ type: Types.ObjectId, ref: Customer.name, required: true })
  customer: Types.ObjectId;

  @Prop({ type: String, required: true })
  customerName: string;
}
export const OrderedBySchema = SchemaFactory.createForClass(OrderedBy);

@Schema({ _id: false })
export class OrderedFrom {
  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  @Prop({ type: String, required: true })
  shopName: string;

  @Prop({ type: String, required: true })
  shopImage: string;
}
export const OrderedFromSchema = SchemaFactory.createForClass(OrderedFrom);

@Schema({ _id: false })
export class HandledBy {
  @Prop({ type: Types.ObjectId, ref: Employee.name, default: null })
  employee: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  employeeName: string | null;

  @Prop({ type: Types.ObjectId, ref: Shift.name, default: null })
  shift: Types.ObjectId | null;
}
export const HandledBySchema = SchemaFactory.createForClass(HandledBy);

@Schema({ _id: false })
export class OrderFinances {
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalCartSum: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  sentSum: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  deliveryPrice: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  systemTax: number;

  @Prop({ type: Number, required: false, default: 0 })
  usedBonusPoints: number;

  @Prop({ type: Number, required: false, default: 0 })
  totalWeightCompensationBonus: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  totalSum: number;
}
export const OrderFinancesSchema = SchemaFactory.createForClass(OrderFinances);

@Schema({ _id: false })
export class OrderRating {
  @Prop({ type: Number, default: 0, min: 0, max: 5 })
  settedRating: number;

  @Prop({ type: Date, default: null })
  feedbackAt: Date | null;

  @Prop({ type: [String], enum: [...Object.values(PositiveFeedbackTag), ...Object.values(NegativeFeedbackTag)], default: [] })
  feedbackTags: (PositiveFeedbackTag | NegativeFeedbackTag)[];

  @Prop({ type: String, default: '' })
  feedbackComment: string;
}
export const OrderRatingSchema = SchemaFactory.createForClass(OrderRating);

@Schema({ _id: false })
export class OrderEventActor {
  @Prop({ type: String, enum: Object.values(OrderEventActorType), required: true })
  type: OrderEventActorType;

  @Prop({ type: Types.ObjectId, required: true })
  id: Types.ObjectId;

  @Prop({ type: String, required: false })
  name?: string;
}
export const OrderEventActorSchema = SchemaFactory.createForClass(OrderEventActor);

@Schema({ _id: true })
export class OrderEvent {
  _id: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(OrderEventType), required: true })
  type: OrderEventType;

  @Prop({ type: Date, required: true, default: () => new Date() })
  timestamp: Date;

  @Prop({ type: OrderEventActorSchema, required: false })
  actor?: OrderEventActor;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  data?: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: Record<string, any>;
}
export const OrderEventSchema = SchemaFactory.createForClass(OrderEvent);

@Schema({ _id: false })
export class OrderDelivery {
  @Prop({ type: String, required: true, default: '' })
  deliveryAddress: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deliveryPrice: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deliveryTime: number;
}
export const OrderDeliverySchema = SchemaFactory.createForClass(OrderDelivery);

@Schema({ _id: false })
export class OrderProduct {
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, required: true })
  shopProduct: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ProductCategory), required: true })
  category: ProductCategory;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: Types.ObjectId, ref: Image.name, required: false })
  cardImage: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ProductMeasuringScale), required: true })
  measuringScale: ProductMeasuringScale;

  @Prop({ type: Number, required: true, min: 0 })
  selectedQuantity: number;

  @Prop({ type: Number, min: 0, required: false, default: null })
  actualQuantity: number | null;

  @Prop({ type: Number, min: 0, required: false, default: 0 })
  weightCompensationBonus: number;
}
export const OrderProductSchema = SchemaFactory.createForClass(OrderProduct);

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Order {

  _id: Types.ObjectId;
  orderId?: string;
  createdAt?: Date;
  updatedAt?: Date;

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
