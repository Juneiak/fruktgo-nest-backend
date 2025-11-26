import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Address } from 'src/infra/addresses/address.schema';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class CartDeliveryInfo {
  @Prop({ type: Types.ObjectId, ref: Address.name, default: null })
  addressId: Types.ObjectId | null;

  @Prop({ type: Number, min: 0, default: 0 })
  price: number;

  @Prop({ type: Number, min: 0, default: null })
  estimatedTime: number | null; // minutes
}
export const CartDeliveryInfoSchema = SchemaFactory.createForClass(CartDeliveryInfo);

@Schema({ _id: false })
export class CartProduct {
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, required: true })
  shopProduct: Types.ObjectId;

  @Prop({ type: Number, min: 0, required: true })
  selectedQuantity: number;
}
export const CartProductSchema = SchemaFactory.createForClass(CartProduct);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Cart extends Document {
  _id: Types.ObjectId;
  cartId: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, unique: true })
  customer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shop', default: null })
  selectedShop: Types.ObjectId | null;

  @Prop({ type: [CartProductSchema], required: true, default: () => [] })
  products: CartProduct[];

  @Prop({ type: Number, required: true, default: 0 })
  totalSum: number;

  @Prop({ type: CartDeliveryInfoSchema, default: () => ({}) })
  deliveryInfo: CartDeliveryInfo;

  @Prop({ type: Boolean, required: true, default: false })
  isReadyToOrder: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.plugin(mongooseLeanVirtuals as any);

// Index for fast lookup by customer
CartSchema.index({ customer: 1 }, { unique: true });

// Virtual field
CartSchema.virtual('cartId').get(function (this: Cart): string {
  return this._id.toString();
});

export type CartModel = Model<Cart>;
