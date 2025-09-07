import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/types';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shop } from 'src/modules/shop/shop/shop.schema';
import { RequestToEmployee } from './request-to-employee.schema';
import { Shift } from 'src/modules/shop/shift/shift.schema';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked } from 'src/common/schemas/common-schemas';
import { BlockStatus } from 'src/common/enums/common.enum';

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
  readonly employeeId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: BlockedSchema, required: true, _id: false, default: { status: BlockStatus.ACTIVE }})
  blocked: Blocked;

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

  @Prop({ type: String, required: false, default: null })
  sellerNote?: string | null;

  @Prop({ type: String, required: false, default: null })
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
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.plugin(mongooseLeanVirtuals as any);
EmployeeSchema.plugin(mongoosePaginate);

EmployeeSchema.virtual('employeeId').get(function (this: Employee): string {
  return this._id.toString();
});

export type EmployeeDocument = HydratedDocument<Employee>;
export type EmployeeModel = PaginateModel<EmployeeDocument>;
