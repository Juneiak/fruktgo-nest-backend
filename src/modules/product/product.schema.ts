import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Seller } from 'src/modules/seller/seller.schema';
import { ProductCategory, ProductMeasuringScale, ProductStepRate } from './product.enums';
import { Image } from 'src/infra/images/image.schema';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ProductStatistics {
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalLast7daysSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalSales: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalLast7daysWriteOff: number;
}
export const ProductStatisticsSchema = SchemaFactory.createForClass(ProductStatistics);


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class Product {
  readonly productId: string;
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: Image.name })
  cardImage?: Types.ObjectId | null;

  @Prop({ type: String })
  productArticle?: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, enum: Object.values(ProductCategory), required: true })
  category: ProductCategory;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalStockQuantity: number;

  @Prop({ type: Number, min: 1, required: true })
  price: number;

  @Prop({ type: String, enum: Object.values(ProductMeasuringScale), required: true })
  measuringScale: ProductMeasuringScale;

  @Prop({ type: String, enum: Object.values(ProductStepRate), required: true })
  stepRate: ProductStepRate;

  @Prop({ type: String, default: '' })
  aboutProduct?: string;

  @Prop({ type: ProductStatisticsSchema, required: true, default: () => ({}) })
  statistics: ProductStatistics;

  @Prop({ type: String})
  origin?: string;

  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  owner: Types.ObjectId;

  readonly shopProducts: any[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.plugin(mongooseLeanVirtuals as any);
ProductSchema.plugin(mongoosePaginate);

ProductSchema.virtual('productId').get(function (this: Product) {
  return this._id.toString();
});

ProductSchema.virtual('shopProducts', {
  ref: 'ShopProduct',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

ProductSchema.index({ owner: 1, createdAt: -1 });

export type ProductDocument = HydratedDocument<Product>;
export type ProductModel = PaginateModel<ProductDocument>;