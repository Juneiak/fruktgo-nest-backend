import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Order } from 'src/modules/order/order.schema';
import { Shift } from 'src/modules/shift/shift.schema';
import { BlockedSchema, Blocked, AddressSchema, Address } from 'src/common/schemas/common-schemas';
import { BlockStatus } from 'src/common/enums/common.enum';
import { DEFAULT_MIN_WEIGHT_PERCENTAGE, DEFAULT_ACCEPTANCE_LIMIT, DEFAULT_ASSEMBLY_LIMIT } from 'src/common/constants';

export enum ShopStatus {
  OPENED='opened',
  CLOSED='closed',
  PAUSED='paused',
}


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Shop {

  _id: Types.ObjectId;
  readonly shopId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  owner: Types.ObjectId;

  @Prop({ type: BlockedSchema, required: true, default: { status: BlockStatus.ACTIVE }})
  blocked: Blocked;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: String, required: true })
  shopName: string;

  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false, default: null })
  shopImage?: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  aboutShop?: string | null;

  @Prop({ type: AddressSchema, required: false, default: null })
  address?: Address | null;

  @Prop({ type: String, enum: Object.values(ShopStatus), default: ShopStatus.CLOSED, required: true })
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

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: false, default: null })
  currentShift: Types.ObjectId | Shift | null;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopOrdersCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  shopProductsCount: number;

  @Prop({ type: Number, min: 0, default: 0, required: true })
  pinnedEmployeesCount: number;

  @Prop({ type: String, required: false, default: null })
  sellerNote?: string | null;

  @Prop({ type: String, required: false, default: null })
  internalNote?: string | null;

  @Prop({ type: [Types.ObjectId], ref: 'Order', required: false, default: [] })
  activeOrders: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'ShopAccount', required: false, default: null })
  shopAccount: Types.ObjectId | null;

  @Prop({ type: Number, min: 1, default: DEFAULT_ACCEPTANCE_LIMIT, required: true })
  acceptanceTimeLimit: number;    

  @Prop({ type: Number, min: 0, default: DEFAULT_ASSEMBLY_LIMIT, required: true })
  assemblyTimeLimit: number;

  @Prop({ type: Number, min: 0, default: DEFAULT_MIN_WEIGHT_PERCENTAGE, required: true })
  minWeightPercentage: number;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
ShopSchema.plugin(mongooseLeanVirtuals as any);
ShopSchema.plugin(mongoosePaginate);

ShopSchema.virtual('shopId').get(function (this: Shop): string {
  return this._id.toString();
});

export type ShopDocument = HydratedDocument<Shop>;
export type ShopModel = PaginateModel<ShopDocument>;