import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked } from 'src/common/schemas/common-schemas';
import { SellerAccount } from 'src/modules/seller-account/seller-account.schema';
import { Image } from 'src/infra/images/infrastructure/image.schema';
import { initBlocked } from 'src/common/schemas/common-schemas';
import { Shop } from '../shop/shop.schema';
  

const sellerStatisticsSchema = {
  totalSales: { type: Number, min: 0, required: true, default: 0 },
  totalOrders: { type: Number, min: 0, required: true, default: 0 },
  shopsCount: { type: Number, min: 0, required: true, default: 0 },
  employeesCount: { type: Number, min: 0, required: true, default: 0 },
  productsCount: { type: Number, min: 0, required: true, default: 0 }
};

interface SellerStatistics {
  totalSales: number;
  totalOrders: number;
  shopsCount: number;
  employeesCount: number;
  productsCount: number;
};

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Seller {
  _id: Types.ObjectId;
  readonly sellerId: string;

  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: String, required: true })
  phone: string;

  @Prop({ type: Types.ObjectId, ref: SellerAccount.name, default: null })
  account: Types.ObjectId | null;
  
  @Prop({ type: Number, unique: true, required: true })
  telegramId: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String })
  telegramFirstName?: string;

  @Prop({ type: String })
  telegramLastName?: string;

  @Prop({ type: Types.ObjectId, ref: Image.name })
  sellerLogo?: Types.ObjectId;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, required: true })
  inn: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: BlockedSchema, required: true, default: () => initBlocked })
  blocked: Blocked;

  @Prop({ type: String, enum: VerifiedStatus, required: true, default: VerifiedStatus.IS_CHECKING })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: sellerStatisticsSchema, required: true, default: () => ({}) })
  statistics: SellerStatistics;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: String })
  internalNote: string;

  @Prop({ type: [Types.ObjectId], ref: Shop.name, default: () => [] })
  shops: Types.ObjectId[];
}

export const SellerSchema = SchemaFactory.createForClass(Seller);

// плагины
SellerSchema.plugin(mongooseLeanVirtuals as any);
SellerSchema.plugin(mongoosePaginate);

SellerSchema.virtual('sellerId').get(function (this: Seller): string {
  return this._id.toString();
});

SellerSchema.index({ telegramId: 1 }, { unique: true });

export type SellerDocument = HydratedDocument<Seller>;
export type SellerModel = PaginateModel<SellerDocument>;
