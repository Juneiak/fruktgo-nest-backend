import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked, initBlocked } from 'src/common/schemas/common-schemas';
import { Order } from 'src/modules/order/order.schema';
import { Address } from 'src/infra/addresses/address.schema';
import { Cart } from '../cart';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class CustomerStatistics {
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  ordersCount: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalSpent: number;
}
export const CustomerStatisticsSchema = SchemaFactory.createForClass(CustomerStatistics);


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Customer {
  _id: Types.ObjectId;
  
  customerId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, unique: true, sparse: true })
  phone?: string;

  @Prop({ type: String, unique: true, sparse: true })
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

  @Prop({ type: CustomerStatisticsSchema, required: true, default: () => ({}) })
  statistics: CustomerStatistics;

  @Prop({ type: String })
  internalNote?: string;

  @Prop({ type: [Types.ObjectId], ref: Address.name, default: () => [] })
  addresses: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: Address.name, default: null })
  selectedAddress: Types.ObjectId | null;

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
