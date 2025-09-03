import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shop } from 'src/modules/shop/schemas/shop.schema';
import { RequestToEmployee } from './request-to-employee.schema';
import { Shift } from 'src/modules/shop/schemas/shift.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';

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
export class Employee {

  _id: Types.ObjectId;
  // virtuals (TS-объявления)
  readonly employeeId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Boolean, required: true, default: false })
  isBlocked: boolean;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), default: VerifiedStatus.IS_CHECKING, required: true })
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

  @Prop({ type: String, enum: Object.values(UserSex), default: UserSex.NOT_SPECIFIED })
  sex?: UserSex

  @Prop({ type: String, enum: Object.values(EmployeeStatus), default: EmployeeStatus.NOT_PINNED })
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

  @Prop({ type: Types.ObjectId, ref: 'Shift', required: false, default: null })
  openedShift?: Types.ObjectId | Shift | null;

  // virtuals (TS-объявления)
  readonly requestsFromSellers?: RequestToEmployee[];
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.plugin(mongooseLeanVirtuals as any);
EmployeeSchema.plugin(mongoosePaginate);

EmployeeSchema.virtual('employeeId').get(function (this: Employee): string {
  return this._id.toString();
});

EmployeeSchema.virtual('requestsFromSellers', {
  ref: 'RequestToEmployee',
  localField: '_id',
  foreignField: 'to',
  justOne: false
});

export type EmployeeDocument = HydratedDocument<Employee>;
export type EmployeeModel = PaginateModel<EmployeeDocument>;
