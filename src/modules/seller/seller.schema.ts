import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/types';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { RequestToEmployee } from 'src/modules/employee/schemas/request-to-employee.schema'
import { SellerLog } from 'src/common/modules/logs/logs.schemas';


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Seller extends Document {

  _id: Types.ObjectId;
  sellerId: string;

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

  @Prop({ type: String, format: 'email', required: false, default: null })
  email?: string | null;

  @Prop({ type: Boolean, default: false, required: true })
  isBlocked: boolean;

  @Prop({ type: String, enum: VerifiedStatus, default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  totalSales: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  totalOrders: number;

  @Prop({ type: Date, nullable: true })
  lastLoginAt?: Date | null;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopsCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  employeesCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  productsCount: number;

  @Prop({ type: String, nullable: true, select: false })
  internalNote?: string | null;

  @Prop({ type: [Types.ObjectId], ref: 'Shop', default: [] })
  shops?: Types.ObjectId[];

  products?: any[];

  employees?: any[];

  logs?: any[];

  requestsToEmployees?: RequestToEmployee[];
}

export const SellerSchema = SchemaFactory.createForClass(Seller);
SellerSchema.plugin(mongooseLeanVirtuals as any);

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


SellerSchema.virtual('logs', {
  ref: 'SellerLog',
  localField: '_id',
  foreignField: 'seller',
  justOne: false
});