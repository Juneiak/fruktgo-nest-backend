import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AdminLoginCode extends Document {

  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: false })
  admin: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: Boolean, default: false })
  confirmed: boolean;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const AdminLoginCodeSchema = SchemaFactory.createForClass(AdminLoginCode);

// 🔥 TTL-индекс: удаляет записи после наступления expiresAt
AdminLoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });