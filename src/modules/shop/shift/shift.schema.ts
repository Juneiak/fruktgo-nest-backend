import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Shop } from 'src/modules/shop/shop/shop.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';


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
export class Shift {

  _id: Types.ObjectId;
  // virtuals (TS-объявления)
  readonly shiftId?: string;

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: true })
  shop: Types.ObjectId;
  
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
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
ShiftSchema.plugin(mongooseLeanVirtuals as any);
ShiftSchema.plugin(mongoosePaginate);

ShiftSchema.virtual('shiftId').get(function (this: Shift): string {
  return this._id.toString();
});

export type ShiftDocument = HydratedDocument<Shift>;
export type ShiftModel = PaginateModel<ShiftDocument>;
