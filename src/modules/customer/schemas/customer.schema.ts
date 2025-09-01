import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/types/index';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Cart } from './cart.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { CustomerLog } from 'src/common/modules/logs/logs.schemas';

export const AddressSchema = {
  address: { type: String, required: true },
  apartment: { type: String, required: true, default: null },
  entrance: { type: String, required: true, default: null },
  floor: { type: String, required: true, default: null },
  intercomCode: { type: String, default: null },
  isSelected: { type: Boolean, default: false },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
};
interface Address {
  city: string;
  street: string;
  house: string | null;         // Квартира или офис
  entrance: string | null;          // Подъезд
  floor: string | null;             // Этаж
  apartment: string | null;
  intercomCode: string | null;   
  isSelected: boolean;
  latitude?: number | null;
  longitude?: number | null;
  _id: Types.ObjectId;
};


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Customer {
  _id: Types.ObjectId;
  
  readonly customerId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, default: null, required: false})
  phone: string | null;

  @Prop({ type: String, format: 'email', required: false})
  email: string;
  
  @Prop({ type: Number, required: true, unique: true })
  telegramId: number;

  @Prop({ type: String, required: false, default: null })
  telegramUsername?: string;

  @Prop({ type: String, required: false, default: null})
  telegramFirstName?: string;

  @Prop({ type: String, required: false, default: null})
  telegramLastName?: string;

  @Prop({ type: Boolean, default: false, required: true })
  isBlocked: boolean;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: String, required: true, })
  customerName: string;

  @Prop({ type: String, enum: Object.values(UserSex), default: UserSex.NOT_SPECIFIED })
  sex?: UserSex;

  @Prop({ type: Date })
  birthDate?: Date | null;

  @Prop({ type: Number, minimum: 0, required: true, default: 0 })
  bonusPoints: number;

  @Prop({ type: Date })
  lastLoginAt?: Date | null;

  @Prop({ type: Date })
  lastOrderAt?: Date | null;

  @Prop({ type: Number, minimum: 0, required: true, default: 0 })
  ordersCount: number;

  @Prop({ type: Number, minimum: 0, required: true, default: 0 })
  totalSpent: number;

  @Prop({ type: String, select: false })
  internalNote?: string | null;

  @Prop({ type: [AddressSchema], default: [] })
  savedAddresses: Address[];

  @Prop({ type: Types.ObjectId, ref: 'Cart', default: null })
  cart: Types.ObjectId | Cart | null;
  
  @Prop({ type: [Types.ObjectId], ref: 'Order', default: [] })
  activeOrders: Types.ObjectId[];

  readonly orders?: any[];
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.plugin(mongooseLeanVirtuals as any);
CustomerSchema.plugin(mongoosePaginate);

CustomerSchema.virtual('customerId').get(function (this: Customer): string {
  return this._id.toString();
});

CustomerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'orderedBy.customer',
  justOne: false
});

export type CustomerDocument = HydratedDocument<Customer>;
export type CustomerModel = PaginateModel<CustomerDocument>;
