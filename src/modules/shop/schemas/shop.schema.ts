import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Order } from 'src/modules/order/order.schema';
import { Shift } from 'src/modules/shop/schemas/shift.schema';
import { ShopLog } from 'src/common/modules/logs/logs.schemas';

export enum ShopStatus {
  OPENED='opened',
  CLOSED='closed',
  PAUSED='paused',
}


const ShopAddressSchema = {
  city: { type: String, required: false, default: null },
  street: { type: String, required: false, default: null },
  house: { type: String, required: false, default: null },
  latitude: { type: Number, required: false, default: null },
  longitude: { type: Number, required: false, default: null },
  _id: false,
};
export interface ShopAddress {
  city: string;
  street: string;
  house: string;
  latitude: number;
  longitude: number;
}

//TODO: внедрить в конфиг
// export const orderMetaData = {
//   acceptanceLimit: 180,
//   assemblyLimit: 300,
//   minWeightPercentage: 0.9,
// };

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Shop extends Document {

  _id: Types.ObjectId;
  shopId: string;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  owner: Types.ObjectId;

  @Prop({ type: Boolean, default: false, required: true })
  isBlocked: boolean;

  @Prop({ type: String, enum: VerifiedStatus, default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: String, required: true })
  shopName: string;

  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false, default: null })
  shopImage?: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  aboutShop?: string | null;

  @Prop({ type: ShopAddressSchema, required: false, default: {} })
  address?: ShopAddress | null;

  @Prop({ type: String, enum: ShopStatus, default: ShopStatus.CLOSED, required: true })
  status: ShopStatus;

  @Prop({ type: String, required: false, default: null })
  openAt?: string | null;

  @Prop({ type: String, required: false, default: null })
  closeAt?: string | null;

  @Prop({ type: Number, min: 0, max: 5, default: 0, required: true })
  avgRating: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  totalSales: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  ratingsCount: number;

  @Prop({ type: Number, min: 1, default: 1, required: true })
  minOrderSum: number;
  
  @Prop({ type: Date, required: false, default: null })
  lastShiftDate?: Date | null;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopOrdersCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopProductsCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  pinnedEmployeesCount: number;

  @Prop({ type: String, required: false, select: false, default: null })
  sellerNote?: string | null;

  @Prop({ type: String, required: false, select: false, default: null })
  internalNote?: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: false, default: null })
  currentShift: Types.ObjectId | Shift | null;

  @Prop({ type: [Types.ObjectId], ref: 'Order', required: false, default: [] })
  activeOrders: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'ShopAccount', required: false, default: null })
  shopAccount: Types.ObjectId | null;

  pinnedEmployees: any[];

  shopProducts: any[];

  shopOrders: any[];

  shopShifts: any[];

  logs: ShopLog[] | any[];
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
ShopSchema.plugin(mongooseLeanVirtuals as any);

ShopSchema.virtual('shopId').get(function (this: Shop & { _id: Types.ObjectId }): string {
  return this._id.toString();
});


ShopSchema.virtual('pinnedEmployees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'pinnedTo',
  justOne: false
});

ShopSchema.virtual('shopProducts', {
  ref: 'ShopProduct',
  localField: '_id',
  foreignField: 'pinnedTo',
  justOne: false
});

ShopSchema.virtual('shopOrders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'orderedFrom',
  justOne: false
});

ShopSchema.virtual('shopShifts', {
  ref: 'Shift',
  localField: '_id',
  foreignField: 'shop',
  justOne: false
});


ShopSchema.virtual('logs', {
  ref: 'ShopLog',
  localField: '_id',
  foreignField: 'shop',
  justOne: false
});