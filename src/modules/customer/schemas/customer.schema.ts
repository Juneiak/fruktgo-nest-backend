import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Cart } from './cart.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked, AddressSchema, Address } from 'src/common/schemas/common-schemas';
import { BlockStatus } from 'src/common/enums/common.enum';


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

  @Prop({ type: BlockedSchema, required: true, _id: false, default: { status: BlockStatus.ACTIVE }})
  blocked: Blocked;

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

  @Prop({ type: String, default: null })
  internalNote?: string | null;

  @Prop({ type: [AddressSchema], default: [] })
  savedAddresses: Address[];

  @Prop({ type: Types.ObjectId, ref: 'Address', default: null })
  selectedAddressId: Types.ObjectId | Address | null;

  @Prop({ type: Types.ObjectId, ref: 'Cart', default: null })
  cart: Types.ObjectId | Cart | null;
  
  @Prop({ type: [Types.ObjectId], ref: 'Order', default: [] })
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
