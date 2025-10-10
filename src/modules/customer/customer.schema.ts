import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked, AddressSchema, Address, initBlocked } from 'src/common/schemas/common-schemas';
import { Cart } from './cart.schema';
import { Order } from 'src/modules/order/order.schema';


const customerStatisticsSchema = {
  ordersCount: { type: Number, minimum: 0, required: true, default: 0 },
  totalSpent: { type: Number, minimum: 0, required: true, default: 0 },
  _id: false
};

interface CustomerStatistics {
  ordersCount: number;
  totalSpent: number;
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

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;
  
  @Prop({ type: Number, unique: true, required: true })
  telegramId: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String })
  telegramFirstName?: string;

  @Prop({ type: String })
  telegramLastName?: string;

  @Prop({ type: BlockedSchema, required: true, default: () => initBlocked })
  blocked: Blocked;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), required: true, default: VerifiedStatus.IS_CHECKING })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, enum: Object.values(UserSex), default: UserSex.NOT_SPECIFIED })
  sex?: UserSex;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;

  @Prop({ type: Date, default: null })
  lastOrderAt?: Date | null;

  @Prop({ type: customerStatisticsSchema, required: true, default: () => ({}) })
  statistics: CustomerStatistics;

  @Prop({ type: String })
  internalNote?: string;

  @Prop({ type: [AddressSchema], default: () => [] })
  savedAddresses: Address[];

  @Prop({ type: String, default: null })
  selectedAddressId: string | null;

  @Prop({ type: Types.ObjectId, ref: Cart.name, default: null })
  cart: Types.ObjectId | null;

  @Prop({ type: [Types.ObjectId], ref: Order.name, default: () => [] })
  activeOrders: Types.ObjectId[];
}


export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.plugin(mongooseLeanVirtuals as any);
CustomerSchema.plugin(mongoosePaginate);

CustomerSchema.virtual('customerId').get(function (this: Customer): string {
  return this._id.toString();
});

export type CustomerDocument = HydratedDocument<Customer>;
export type CustomerModel = PaginateModel<CustomerDocument>;
