import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { PaginateModel } from 'mongoose';
import { UserType } from "src/common/enums/common.enum";

export enum LogLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum LogEntityType {
  CUSTOMER = 'Customer',
  EMPLOYEE = 'Employee', 
  ORDER = 'Order',
  PRODUCT = 'Product',
  SELLER = 'Seller',
  SHIFT = 'Shift',
  SHOP_PRODUCT = 'ShopProduct',
  SHOP = 'Shop',
  SHOP_ACCOUNT = 'ShopAccount',
  SELLER_ACCOUNT = 'SellerAccount',
}
// ====================================================
// УНИВЕРСАЛЬНАЯ СХЕМА ДЛЯ ВСЕХ ЛОГОВ
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  discriminatorKey: 'entityType',
})
export class BaseLog {
  _id: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(LogEntityType), required: true })
  entityType: LogEntityType;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'entityType' })
  entityId: Types.ObjectId;

  @Prop({ type: [String], enum: Object.values(UserType), default: [UserType.ADMIN] })
  forRoles: UserType[];

  @Prop({ type: String, enum: Object.values(LogLevel), default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true })
  text: string;

  // Виртуальные свойства для обратной совместимости
  readonly logId?: string;
}

export const BaseLogSchema = SchemaFactory.createForClass(BaseLog);
BaseLogSchema.plugin(mongooseLeanVirtuals as any);
BaseLogSchema.plugin(mongoosePaginate);

// Виртуальное поле для ID
BaseLogSchema.virtual('logId').get(function (this: BaseLog) {
  return this._id.toString();
});

// Индексы для производительности
BaseLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
BaseLogSchema.index({ logLevel: 1, createdAt: -1 });

export type BaseLogDocument = BaseLog & Document;
export type LogModel = PaginateModel<BaseLogDocument>;

// Типы для обратной совместимости
export type CustomerLog = BaseLog & { entityType: LogEntityType.CUSTOMER };
export type EmployeeLog = BaseLog & { entityType: LogEntityType.EMPLOYEE };
export type OrderLog = BaseLog & { entityType: LogEntityType.ORDER };
export type ProductLog = BaseLog & { entityType: LogEntityType.PRODUCT };
export type SellerLog = BaseLog & { entityType: LogEntityType.SELLER };
export type ShiftLog = BaseLog & { entityType: LogEntityType.SHIFT };
export type ShopProductLog = BaseLog & { entityType: LogEntityType.SHOP_PRODUCT };
export type ShopLog = BaseLog & { entityType: LogEntityType.SHOP };
export type ShopAccountLog = BaseLog & { entityType: LogEntityType.SHOP_ACCOUNT };
export type SellerAccountLog = BaseLog & { entityType: LogEntityType.SELLER_ACCOUNT };
