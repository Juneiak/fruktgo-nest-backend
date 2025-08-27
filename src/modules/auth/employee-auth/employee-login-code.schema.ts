import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class EmployeeLoginCode extends Document {

  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employee: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  confirmed: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;

  @Prop({ type: String, required: false })
  shopName: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const EmployeeLoginCodeSchema = SchemaFactory.createForClass(EmployeeLoginCode);

// 🔥 TTL-индекс: удаляет записи после наступления expiresAt
EmployeeLoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });