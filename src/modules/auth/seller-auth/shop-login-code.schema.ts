import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ShopLoginCode extends Document {

  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: false })
  shop: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: false })
  owner: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  confirmed: boolean;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const ShopLoginCodeSchema = SchemaFactory.createForClass(ShopLoginCode);

// 🔥 TTL-индекс: удаляет записи после наступления expiresAt
ShopLoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });