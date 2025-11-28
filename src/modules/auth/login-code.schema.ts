import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { LoginCodeType } from './auth.enums';

export interface LoginCodeContext {
  ownerId?: Types.ObjectId;
  shopId?: Types.ObjectId;
  shopName?: string;
  employeeId?: Types.ObjectId;
  metadata?: Record<string, any>;
}

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class LoginCode extends Document {
  _id: Types.ObjectId;
  codeId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: LoginCodeType, required: true })
  type: LoginCodeType;

  @Prop({ type: Boolean, default: false })
  confirmed: boolean;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  // Основная ссылка на сущность (заполняется после подтверждения)
  @Prop({ type: Types.ObjectId, refPath: 'entityModel', required: false })
  entityId: Types.ObjectId;

  @Prop({ type: String, required: false })
  entityModel: string; // 'Admin' | 'Customer' | 'Seller' | 'Shop' | 'Employee'

  @Prop({ type: Object, default: {} })
  context: LoginCodeContext;
}

export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);

// Virtual codeId
LoginCodeSchema.virtual('codeId').get(function (this: LoginCode): string {
  return this._id.toString();
});

// TTL-индекс (автоудаление просроченных)
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Составные индексы
LoginCodeSchema.index({ type: 1, code: 1 });
LoginCodeSchema.index({ type: 1, entityId: 1, confirmed: 1 });
LoginCodeSchema.index({ type: 1, 'context.shopId': 1, confirmed: 1 });

export type LoginCodeModel = Model<LoginCode>;