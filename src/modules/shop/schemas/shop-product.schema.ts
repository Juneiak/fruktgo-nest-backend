import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { Product } from 'src/modules/product/product.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';

export enum ShopProductStatus {
  ACTIVE='active',
  PAUSED='paused',
  OUT_OF_STOCK='outOfStock',
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class ShopProduct {

  _id: Types.ObjectId;
  // virtuals (TS-объявления)
  readonly shopProductId?: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  pinnedTo: Types.ObjectId | Shop;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId | Product;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  stockQuantity: number;

  @Prop({ type: String, enum: Object.values(ShopProductStatus), default: ShopProductStatus.ACTIVE, required: true })
  status: ShopProductStatus;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  last7daysSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  last7daysWriteOff: number;
  
  @Prop({ type: [Types.ObjectId], ref: 'UploadedFile', default: [] })
  images: Types.ObjectId[];
}

export const ShopProductSchema = SchemaFactory.createForClass(ShopProduct);
ShopProductSchema.plugin(mongooseLeanVirtuals as any);
ShopProductSchema.plugin(mongoosePaginate);

ShopProductSchema.virtual('shopProductId').get(function (this: ShopProduct): string {
  return this._id.toString();
});


export type ShopProductDocument = HydratedDocument<ShopProduct>;
export type ShopProductModel = PaginateModel<ShopProductDocument>;
