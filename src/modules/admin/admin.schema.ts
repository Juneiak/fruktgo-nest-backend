import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class Admin extends Document {

  _id: Types.ObjectId;
  id: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: Number, required: true, unique: true, select: false })
  telegramId: number;

  @Prop({ type: String, required: false, default: null, select: false })
  telegramUsername?: string;

  @Prop({ type: String, required: false, default: null, select: false })
  telegramFirstName?: string;

  @Prop({ type: String, required: false, default: null, select: false })
  telegramLastName?: string;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);


