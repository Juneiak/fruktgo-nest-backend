import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { RequestToEmployee } from 'src/modules/employee/schemas/request-to-employee.schema'

  
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Seller {
  _id: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: String, required: false, default: null })
  phone?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'SellerAccount', default: null })
  account?: Types.ObjectId | null;
  
  @Prop({ type: Number, required: true, unique: true })
  telegramId: number;

  @Prop({ type: String, required: false, default: null })
  telegramUsername?: string;

  @Prop({ type: String, required: false, default: null })
  telegramFirstName?: string;

  @Prop({ type: String, required: false, default: null })
  telegramLastName?: string;

  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false, default: null })
  sellerLogo?: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  companyName?: string | null;

  @Prop({ type: String, required: false, default: null })
  inn?: string | null;

  @Prop({ type: String, required: false, default: null })
  email?: string | null;

  @Prop({ type: Boolean, default: false, required: true })
  isBlocked: boolean;

  @Prop({ type: String, enum: VerifiedStatus, default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  totalSales: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  totalOrders: number;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date | null;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopsCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  employeesCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  productsCount: number;

  @Prop({ type: String, default: null })
  internalNote?: string | null;

  @Prop({ type: [Types.ObjectId], ref: 'Shop', default: [] })
  shops?: Types.ObjectId[];

  // virtuals (TS-объявления)
  readonly sellerId: string;
  readonly logs?: any[];
  readonly products?: any[];
  readonly employees?: any[];
  readonly requestsToEmployees?: RequestToEmployee[];
}

export const SellerSchema = SchemaFactory.createForClass(Seller);
SellerSchema.plugin(mongooseLeanVirtuals as any);
SellerSchema.plugin(mongoosePaginate);

SellerSchema.virtual('sellerId').get(function (this: Seller): string {
  return this._id.toString();
});

SellerSchema.virtual('requestsToEmployees', {
  ref: 'RequestToEmployee',
  localField: '_id',
  foreignField: 'from',
  justOne: false
});

SellerSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'owner',
  justOne: false
});

SellerSchema.virtual('employees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'employer',
  justOne: false
});

export type SellerDocument = HydratedDocument<Seller>;
export type SellerModel = PaginateModel<SellerDocument>;
