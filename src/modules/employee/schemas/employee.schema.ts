import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { RequestToEmployee } from './request-to-employee.schema';
import { EmployeeLog } from 'src/common/modules/logs/logs.schemas';
import { Shift } from 'src/modules/shop/schemas/shift.schema';

export enum EmployeeStatus {
  WORKING='working',
  RESTING='resting',
  NOT_PINNED='notPinned',
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Employee extends Document {

  _id: Types.ObjectId;
  employeeId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Boolean, required: true, default: false })
  isBlocked: boolean;

  @Prop({ type: String, enum: VerifiedStatus, default: VerifiedStatus.IS_CHECKING, required: true })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false, default: null })
  employeeAvatar?: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: false, default: null })
  phone: string | null;
  
  @Prop({ type: Number, required: true, unique: true })
  telegramId: number;

  @Prop({ type: String, required: false, default: null })
  telegramUsername?: string;

  @Prop({ type: String, required: false, default: null })
  telegramFirstName?: string;

  @Prop({ type: String, required: false, default: null })
  telegramLastName?: string;

  @Prop({ type: String, enum: UserSex, default: UserSex.NOT_SPECIFIED })
  sex?: UserSex

  @Prop({ type: String, enum: EmployeeStatus, default: EmployeeStatus.NOT_PINNED })
  status: EmployeeStatus;

  @Prop({ type: Date, required: false, default: null })
  birthDate?: Date | null;

  @Prop({ type: String, required: false, default: null })
  position?: string | null;

  @Prop({ type: String, required: false, default: null })
  salary?: string | null;

  @Prop({ type: String, required: false, default: null, select: false })
  sellerNote?: string | null;

  @Prop({ type: String, required: false, default: null, select: false })
  internalNote?: string | null;

  @Prop({ type: Date, required: false, default: null })
  lastLoginAt?: Date | null;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalOrders: number;

  @Prop({ type: Number, min: 0, required: true, default: 0 })
  totalShifts: number;

  @Prop({ type: Number, min: 0, max: 100, required: true, default: 0 })
  shiftRating: number;

  @Prop({ type: Types.ObjectId, ref: 'Shop', required: false, default: null })
  pinnedTo?: Types.ObjectId | Shop | null;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: false, default: null })
  employer: Types.ObjectId | Seller | null;

  requestsFromSellers: RequestToEmployee[];

  openedShifts: Shift[];

  logs: EmployeeLog[] | any[];
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.plugin(mongooseLeanVirtuals as any);

EmployeeSchema.virtual('employeeId').get(function (this: Employee): string {
  return this._id.toString();
});

EmployeeSchema.virtual('requestsFromSellers', {
  ref: 'RequestToEmployee',
  localField: '_id',
  foreignField: 'to',
  justOne: false
});

EmployeeSchema.virtual('openedShifts', {
  ref: 'Shift',
  localField: '_id',
  foreignField: 'openedBy.employee',
  justOne: false
});

EmployeeSchema.virtual('logs', {
  ref: 'EmployeeLog',
  localField: '_id',
  foreignField: 'employee',
  justOne: false
});
