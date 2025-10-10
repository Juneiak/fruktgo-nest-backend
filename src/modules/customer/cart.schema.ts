import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { Customer } from './customer.schema';
import { Shop } from 'src/modules/shop/shop.schema';

const DeliveryInfoSchema = {
  _id: false,
  to: { type: String, default: null },
  from: { type: String, default: null },
  estimatedDeliveryDate: { type: Date, default: null },
  actualDeliveryDate: { type: Date, default: null },
  price: { type: Number, min: 0, default: 0 },
};

interface DeliveryInfo {
  to?: string;
  from?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  price?: number;
};



const CartProductSchema = {
  shopProduct: { type: Types.ObjectId, ref: ShopProduct.name, required: true }, 
  selectedQuantity: { type: Number, min: 0, required: true },
};
interface CartProduct {
  shopProduct: Types.ObjectId;
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

  @Prop({ type: Types.ObjectId, ref: Customer.name, default: null })
  customer: Types.ObjectId | null;

  @Prop({ type: [CartProductSchema], required: true, default: () => [] })
  products: CartProduct[];

  @Prop({ type: Number, required: true, default: 0 })
  totalSum: number;

  @Prop({ type: Types.ObjectId, ref: Shop.name, default: null })
  selectedShopId: Types.ObjectId | null;

  @Prop({ type: Boolean, required: true, default: false })
  isReadyToOrder: boolean;

  @Prop({ type: DeliveryInfoSchema, required: true, default: () => ({}) })
  deliveryInfo: DeliveryInfo;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.plugin(mongooseLeanVirtuals as any);

CartSchema.virtual('cartId').get(function (this: Cart): string {
  return this._id.toString();
});