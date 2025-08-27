import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Seller } from 'src/modules/seller/seller.schema';
import { ProductLog } from 'src/common/modules/logs/logs.schemas';

export enum ProductCategory {
  FRUITS='fruits',
  VEGETABLES='vegetables',
  NUTS='nuts',
  DRIEDS='drieds',
  OTHER='other',
}

export enum ProductMeasuringScale {
  KG='kg',
  PCS='pcs'
}

export enum ProductStepRate {
  STEP_0_1 = '0.1',
  STEP_0_2 = '0.2',
  STEP_0_3 = '0.3',
  STEP_0_5 = '0.5',
  STEP_1 = '1',
  STEP_2 = '2',
  STEP_5 = '5',
  STEP_10 = '10'
}


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Product extends Document {

  _id: Types.ObjectId;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false })
  cardImage?: Types.ObjectId | null;

  @Prop({ type: String, nullable: true })
  productArticle?: string | null;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, enum: ProductCategory, required: true })
  category: ProductCategory;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalStockQuantity: number;

  @Prop({ type: Number, min: 1, required: true })
  price: number;

  @Prop({ type: String, enum: ProductMeasuringScale, required: true })
  measuringScale: ProductMeasuringScale;

  @Prop({ type: String, enum: ProductStepRate, required: true })
  stepRate: ProductStepRate;

  @Prop({ type: String, nullable: true })
  aboutProduct?: string | null;

  @Prop({ type: String, nullable: true })
  origin?: string | null;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalLast7daysSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalLast7daysWriteOff: number;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  owner: Types.ObjectId | Seller;

  shopProducts: any[];

  logs: ProductLog[] | any[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.plugin(mongooseLeanVirtuals as any);

ProductSchema.virtual('productId').get(function (this: Product): string {
  return this._id.toString();
});

ProductSchema.virtual('shopProducts', {
  ref: 'ShopProduct',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});
ProductSchema.virtual('logs', {
  ref: 'ProductLog',
  localField: '_id',
  foreignField: 'product',
  justOne: false
});


