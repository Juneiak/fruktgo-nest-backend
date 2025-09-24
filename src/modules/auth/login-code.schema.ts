// src/modules/auth/schemas/login-code.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LoginCodeType {
  ADMIN = 'admin',
  CUSTOMER = 'customer', 
  SELLER = 'seller',
  SHOP = 'shop',
  EMPLOYEE_TO_SHOP = 'employee_to_shop'
}

@Schema({ timestamps: true })
export class LoginCode extends Document {
  _id: Types.ObjectId;
  id: string;
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

  // Дополнительная информация в зависимости от типа
  @Prop({ type: Object, default: {} })
  context: {
    // Для SHOP
    ownerId?: Types.ObjectId;        // ID продавца-владельца
    
    // Для EMPLOYEE_TO_SHOP
    shopId?: Types.ObjectId;         // ID магазина
    shopName?: string;               // Название магазина
    employeeId?: Types.ObjectId;     // ID сотрудника (может быть заранее известен)
    
    // Для будущих расширений
    metadata?: Record<string, any>;  // Любые дополнительные данные
  };
}

export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);

// TTL-индекс
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Составные индексы для быстрого поиска
LoginCodeSchema.index({ type: 1, code: 1 });
LoginCodeSchema.index({ type: 1, entityId: 1, confirmed: 1 });
LoginCodeSchema.index({ type: 1, 'context.shopId': 1, confirmed: 1 }); // для employee