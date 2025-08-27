import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum LogLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  SERVICE = 'service',
}


// ====================================================
// CUSTOMER LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class CustomerLog extends Document {

  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}

export const CustomerLogSchema = SchemaFactory.createForClass(CustomerLog);
CustomerLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// EMPLOYEE LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class EmployeeLog extends Document {
  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employee: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}

export const EmployeeLogSchema = SchemaFactory.createForClass(EmployeeLog);
EmployeeLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// ORDER LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class OrderLog extends Document {
  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}

export const OrderLogSchema = SchemaFactory.createForClass(OrderLog);
OrderLogSchema.plugin(mongooseLeanVirtuals as any);


// ====================================================
// PRODUCT LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ProductLog extends Document {

  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const ProductLogSchema = SchemaFactory.createForClass(ProductLog);
ProductLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SELLER LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class SellerLog extends Document {
  
  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  seller: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const SellerLogSchema = SchemaFactory.createForClass(SellerLog);
SellerLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SHIFT LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ShiftLog extends Document {

  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  shift: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const ShiftLogSchema = SchemaFactory.createForClass(ShiftLog);
ShiftLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SHOP PRODUCT LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ShopProductLog extends Document {
  
  _id: Types.ObjectId;
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'ShopProduct', required: true })
  shopProduct: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const ShopProductLogSchema = SchemaFactory.createForClass(ShopProductLog);
ShopProductLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SHOP LOG 
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ShopLog extends Document {
  
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const ShopLogSchema = SchemaFactory.createForClass(ShopLog);
ShopLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SHOP ACCOUNT LOG
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class ShopAccountLog extends Document {
  
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ShopAccount', required: true })
  shopAccount: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const ShopAccountLogSchema = SchemaFactory.createForClass(ShopAccountLog);
ShopAccountLogSchema.plugin(mongooseLeanVirtuals as any);



// ====================================================
// SELLER ACCOUNT LOG
// ====================================================
@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class SellerAccountLog extends Document {
  
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SellerAccount', required: true })
  sellerAccount: Types.ObjectId;

  @Prop({ type: String, enum: LogLevel, default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true }) 
  text: string;
}
export const SellerAccountLogSchema = SchemaFactory.createForClass(SellerAccountLog);
SellerAccountLogSchema.plugin(mongooseLeanVirtuals as any);

