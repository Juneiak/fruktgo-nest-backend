import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked, initBlocked } from 'src/common/schemas/common-schemas';
import { Image } from 'src/infra/images/image.schema';
import { Shop } from '../shop/shop.schema';
import { SellerAccount } from '../finance/seller-account/schemas/seller-account.schema';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class SellerStatistics {
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  shopsCount: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  employeesCount: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  productsCount: number;
}
export const SellerStatisticsSchema = SchemaFactory.createForClass(SellerStatistics);

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
  
  @Prop({ type: String, required: true, unique: true })
  phone: string;

  @Prop({ type: Types.ObjectId, ref: SellerAccount.name, required: true })
  account: Types.ObjectId;
  
  @Prop({ type: Number, unique: true, required: true })
  telegramId: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String })
  telegramFirstName?: string;

  @Prop({ type: String })
  telegramLastName?: string;

  @Prop({ type: Types.ObjectId, ref: Image.name })
  sellerLogo?: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, required: true, unique: true })
  inn: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: BlockedSchema, required: true, default: () => initBlocked })
  blocked: Blocked;

  @Prop({ type: String, enum: VerifiedStatus, required: true, default: VerifiedStatus.IS_CHECKING })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: SellerStatisticsSchema, required: true, default: () => ({}) })
  statistics: SellerStatistics;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: String })
  internalNote?: string;

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


export type SellerDocument = HydratedDocument<Seller>;
export type SellerModel = PaginateModel<SellerDocument>;
