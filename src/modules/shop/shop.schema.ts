import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Shift } from 'src/modules/shift/shift.schema';
import { BlockedSchema, Blocked } from 'src/common/schemas/common-schemas';
import {
  DEFAULT_MIN_WEIGHT_DIFFERENCE_PERCENTAGE,
  DEFAULT_ACCEPTANCE_LIMIT,
  DEFAULT_ASSEMBLY_LIMIT
} from 'src/common/constants';
import { ShopStatus } from './shop.enums';
import { Order } from 'src/modules/order/order.schema';
import { ShopAccount } from 'src/modules/finance/shop-account/schemas/shop-account.schema';
import { Image } from 'src/infra/images/image.schema';
import { Seller } from 'src/modules/seller/seller.schema';
import { initBlocked } from 'src/common/schemas/common-schemas';
import { Address } from 'src/infra/addresses/address.schema';


const shopStatisticsSchema = {
  avgRating: { type: Number, min: 0, max: 5, default: 0, required: true },
  totalSales: { type: Number, min: 0, default: 0, required: true },
  ratingsCount: { type: Number, min: 0, default: 0, required: true },
  ordersCount: { type: Number, min: 0, default: 0, required: true },
  productsCount: { type: Number, min: 0, default: 0, required: true },
  employeesCount: { type: Number, min: 0, default: 0, required: true },
};

interface ShopStatistics {
  avgRating: number;
  totalSales: number;
  ratingsCount: number;
  ordersCount: number;
  productsCount: number;
  employeesCount: number;
};


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

  @Prop({ type: String, required: true })
  city: string;

  @Prop({ type: Types.ObjectId, ref: ShopAccount.name, required: true })
  account: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  owner: Types.ObjectId;

  @Prop({ type: BlockedSchema, required: true, default: () => initBlocked })
  blocked: Blocked;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: String, required: true })
  shopName: string;

  @Prop({ type: Types.ObjectId, ref: Image.name, required: false, default: null })
  shopImage?: Types.ObjectId | null;

  @Prop({ type: String})
  aboutShop?: string;

  @Prop({ type: Types.ObjectId, ref: Address.name, default: null })
  address?: Types.ObjectId | null;

  @Prop({ type: String, enum: Object.values(ShopStatus), default: ShopStatus.CLOSED, required: true })
  status: ShopStatus;

  @Prop({ type: String })
  openAt?: string;

  @Prop({ type: String })
  closeAt?: string;

  @Prop({ type: shopStatisticsSchema, required: true, default: () => ({}) })
  statistics: ShopStatistics;

  @Prop({ type: Number, min: 1, default: 1, required: true })
  minOrderSum: number;

  @Prop({ type: Types.ObjectId, ref: Shift.name, required: false, default: null })
  currentShift: Types.ObjectId | null;

  @Prop({ type: String})
  sellerNote?: string;

  @Prop({ type: String})
  internalNote?: string;

  @Prop({ type: [Types.ObjectId], ref: Order.name, default: () => [] })
  activeOrders: Types.ObjectId[];

  @Prop({ type: Number, min: 1, default: DEFAULT_ACCEPTANCE_LIMIT, required: true })
  acceptanceTimeLimit: number;    

  @Prop({ type: Number, min: 1, default: DEFAULT_ASSEMBLY_LIMIT, required: true })
  assemblyTimeLimit: number;

  @Prop({ type: Number, min: 1, default: DEFAULT_MIN_WEIGHT_DIFFERENCE_PERCENTAGE, required: true })
  minWeightDifferencePercentage: number;
}

export const ShopSchema = SchemaFactory.createForClass(Shop);
ShopSchema.plugin(mongooseLeanVirtuals as any);
ShopSchema.plugin(mongoosePaginate);

ShopSchema.virtual('shopId').get(function (this: Shop): string {
  return this._id.toString();
});

export type ShopDocument = HydratedDocument<Shop>;
export type ShopModel = PaginateModel<ShopDocument>;