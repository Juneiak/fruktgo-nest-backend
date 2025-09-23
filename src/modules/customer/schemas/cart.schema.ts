import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/types/index';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Customer } from './customer.schema';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';

const DeliveryInfoSchema = {
  to: { type: String },
  from: { type: String },
  estimatedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },
  price: { type: Number },
  _id: false
};

interface DeliveryInfo {
  to: string;
  from: string;
  estimatedDeliveryDate: Date;
  actualDeliveryDate: Date;
  price: number;
};

const CartProductSchema = {
  shopProduct: { type: Types.ObjectId, ref: 'ShopProduct', required: true }, 
  selectedQuantity: { type: Number, min: 0, required: true },
};
interface CartProduct {
  shopProduct: Types.ObjectId | ShopProduct;
  selectedQuantity: number;
};

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false
})
export class Cart extends Document {

  _id: Types.ObjectId;
  cartId: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', nullable: true, default: null })
  customer: Types.ObjectId | Customer | null;

  @Prop({ type: [CartProductSchema], required: true, default: [] })
  products: CartProduct[];

  @Prop({ type: Number, required: true, default: 0 })
  totalSum: number;

  @Prop({ type: Types.ObjectId, ref: 'Shop', nullable: true, default: null })
  selectedShop: Types.ObjectId | null;

  @Prop({ type: Boolean, required: true, default: false })
  isReadyToOrder: boolean;

  @Prop({ type: DeliveryInfoSchema, default: null })
  deliveryInfo?: DeliveryInfo | null;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.plugin(mongooseLeanVirtuals as any);

CartSchema.virtual('cartId').get(function (this: Cart): string {
  return this._id.toString();
});