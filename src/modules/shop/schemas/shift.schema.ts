import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { ShiftLog } from 'src/common/modules/logs/logs.schemas';
import { Order } from 'src/modules/order/order.schema';


// openedBy
const OpenedBySchema = {
  employee: { type: Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  _id: false,
};
export interface OpenedBy {
  employee: Types.ObjectId;
  employeeName: string;
}

// closedBy
const ClosedBySchema = {
  employee: { type: Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  _id: false,
};
export interface ClosedBy {
  employee: Types.ObjectId;
  employeeName: string;
}


// statistics
const StatisticsSchema = {
  ordersCount: { type: Number, min: 0, default: 0 },
  declinedOrdersCount: { type: Number, min: 0, default: 0 },
  declinedIncome: { type: Number, min: 0, default: 0 },
  totalIncome: { type: Number, min: 0, default: 0 },
  avgOrderPrice: { type: Number, min: 0, default: 0 },
  avgOrderAcceptanceDuration: { type: Number, min: 0, default: 0 },
  avgOrderAssemblyDuration: { type: Number, min: 0, default: 0 },
  _id: false,
};
export interface Statistics {
  ordersCount: number;
  declinedOrdersCount: number;
  declinedIncome: number;
  totalIncome: number;
  avgOrderPrice: number;
  avgOrderAcceptanceDuration: number;
  avgOrderAssemblyDuration: number;
  // topSellingProducts: Types.ObjectId[];
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Shift extends Document {

  _id: Types.ObjectId;
  shiftId: string;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId | Shop;
  
  @Prop({ type: Date, required: true, default: () => new Date() })
  openedAt: Date;

  @Prop({ type: String, required: false, default: null })
  openComment?: string | null;

  @Prop({ type: Date, default: null })
  closedAt?: Date | null;

  @Prop({ type: String, required: false, default: null })
  closeComment?: string | null;

  @Prop({ type: OpenedBySchema, required: true })
  openedBy: OpenedBy;

  @Prop({ type: ClosedBySchema, default: null })
  closedBy?: ClosedBy | null;

  @Prop({ type: StatisticsSchema, required: true, default: {} })
  statistics: Statistics;

  logs: ShiftLog[] | any[];

  orders: Order[] | any[];
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
ShiftSchema.plugin(mongooseLeanVirtuals as any);

ShiftSchema.virtual('shiftId').get(function (this: Shift): string {
  return this._id.toString();
});

ShiftSchema.virtual('logs', {
  ref: 'ShiftLog',
  localField: '_id',
  foreignField: 'shift',
  justOne: false
});

ShiftSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'shift',
  justOne: false
});

//TODO: внедриить
// Маппинг популизированных полей к их типам
export type ShiftPopulatedFieldTypes = {
  shop: Shop;
  logs: ShiftLog[];
};

/**
 * Функция для создания типа Shift с популизированными полями
 * @param fields Массив названий полей, которые были популизированы
 * @returns Тип Shift с указанными популизированными полями
 * @example
 * // Получить тип с популизированным полем shop
 * type ShiftWithShop = PopulatedShift<'shop'>;
 * 
 * // Получить тип с популизированными полями shop и logs
 * type FullyPopulatedShift = PopulatedShift<'shop' | 'logs'>;
 */
// Тип для Shift с популизированными полями
export type PopulatedShift<T extends keyof ShiftPopulatedFieldTypes = never> = Shift & {
  [K in T]: ShiftPopulatedFieldTypes[K];
};

/**
 * Функция для проверки, популизировано ли поле в документе Shift
 * @param shift Документ Shift
 * @param field Название поля для проверки
 * @returns true, если поле популизировано
 * @example
 * if (isShiftFieldPopulated(shift, 'shop')) {
 *   // здесь TypeScript знает, что shift.shop имеет тип Shop
 *   console.log(shift.shop.shopName);
 * }
 */
export function isShiftFieldPopulated<K extends keyof ShiftPopulatedFieldTypes>(
  shift: Shift,
  field: K
): shift is Shift & { [P in K]: ShiftPopulatedFieldTypes[P] } {
  return (
    shift[field] !== null &&
    shift[field] !== undefined &&
    typeof shift[field] === 'object' &&
    !(shift[field] instanceof Types.ObjectId)
  );
}

/**
 * Функция для проверки, популизированы ли указанные поля в документе Shift
 * @param shift Документ Shift
 * @param fields Массив названий полей для проверки
 * @returns true, если все указанные поля популизированы
 * @example
 * if (areShiftFieldsPopulated(shift, ['shop', 'logs'])) {
 *   // здесь TypeScript знает, что shift.shop имеет тип Shop, а shift.logs - тип ShiftLog[]
 *   console.log(shift.shop.shopName, shift.logs.length);
 * }
 */
export function areShiftFieldsPopulated<T extends keyof ShiftPopulatedFieldTypes>(
  shift: Shift,
  fields: T[]
): shift is Shift & { [P in T]: ShiftPopulatedFieldTypes[P] } {
  return fields.every(field => isShiftFieldPopulated(shift, field));
}

