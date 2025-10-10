import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class Platform extends Document {

  _id: Types.ObjectId;
  id: string;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: Number, unique: true, required: true })
  telegramId: number;

  @Prop({ type: String, default: null })
  telegramUsername: string | null;

  @Prop({ type: String, default: null })
  telegramFirstName: string | null;

  @Prop({ type: String, default: null })
  telegramLastName: string | null;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);


