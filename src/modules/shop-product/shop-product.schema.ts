import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Shop } from 'src/modules/shop/shop.schema';
import { Product } from 'src/modules/product/product.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ShopProductStatus } from './shop-product.enums';
import { Image } from 'src/infra/images/image.schema';


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class ShopProduct {

  _id: Types.ObjectId;
  readonly shopProductId?: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  pinnedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId | Product;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  stockQuantity: number;

  /** Зарезервированное количество (при неоплаченных заказах) */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  reservedQuantity: number;

  @Prop({ type: String, enum: Object.values(ShopProductStatus), default: ShopProductStatus.ACTIVE, required: true })
  status: ShopProductStatus;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  last7daysSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  last7daysWriteOff: number;
  
  @Prop({ type: [Types.ObjectId], ref: Image.name, default: [] })
  images: Types.ObjectId[];
}

export const ShopProductSchema = SchemaFactory.createForClass(ShopProduct);
ShopProductSchema.plugin(mongooseLeanVirtuals as any);
ShopProductSchema.plugin(mongoosePaginate);

ShopProductSchema.virtual('shopProductId').get(function (this: ShopProduct): string {
  return this._id.toString();
});

/** Доступное количество = stockQuantity - reservedQuantity */
ShopProductSchema.virtual('availableQuantity').get(function (this: ShopProduct): number {
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
});


export type ShopProductDocument = HydratedDocument<ShopProduct>;
export type ShopProductModel = PaginateModel<ShopProductDocument>;
