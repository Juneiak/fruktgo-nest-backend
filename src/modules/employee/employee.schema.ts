import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import { VerifiedStatus, UserSex } from 'src/common/enums/common.enum';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { BlockedSchema, Blocked, initBlocked } from 'src/common/schemas/common-schemas';
import { EmployeeStatus } from './employee.enums';
import { Shop } from 'src/modules/shop/shop.schema';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shift } from 'src/modules/shift/shift.schema';
import { Image } from 'src/infra/images/image.schema';

const employeeStatisticsSchema = {
  _id: false,
  totalOrders: { type: Number, min: 0, required: true, default: 0 },
  totalShifts: { type: Number, max: 0, required: true, default: 0 },
  shiftRating: { type: Number, min: 0, max: 100, required: true, default: 0 },
};

interface EmployeeStatistics {
  totalOrders: number;
  totalShifts: number;
  shiftRating: number;
};


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

  @Prop({ type: BlockedSchema, required: true, default: initBlocked })
  blocked: Blocked;

  @Prop({ type: String, enum: Object.values(VerifiedStatus), required: true, default: VerifiedStatus.IS_CHECKING })
  verifiedStatus: VerifiedStatus;

  @Prop({ type: Types.ObjectId, ref: Image.name })
  employeeAvatar?: Types.ObjectId;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: true })
  phoneNumber: string;
  
  @Prop({ type: Number, unique: true, required: true })
  telegramId: number;

  @Prop({ type: String })
  telegramUsername?: string;

  @Prop({ type: String })
  telegramFirstName?: string;

  @Prop({ type: String })
  telegramLastName?: string;

  @Prop({ type: String, enum: Object.values(UserSex), default: UserSex.NOT_SPECIFIED })
  sex: UserSex;

  @Prop({ type: String, enum: Object.values(EmployeeStatus), default: EmployeeStatus.NOT_PINNED })
  status: EmployeeStatus;

  @Prop({ type: Date })
  birthDate?: Date;

  @Prop({ type: String })
  position?: string;

  @Prop({ type: String })
  salary?: string;

  @Prop({ type: String })
  sellerNote?: string;

  @Prop({ type: String })
  internalNote?: string;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: employeeStatisticsSchema, required: true, default: () => ({}) })
  statistics: EmployeeStatistics;

  @Prop({ type: Types.ObjectId, ref: Shop.name, default: null })
  pinnedTo: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: Seller.name, default: null })
  employer: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: Shift.name, default: null })
  openedShift: Types.ObjectId | null;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.plugin(mongooseLeanVirtuals as any);
EmployeeSchema.plugin(mongoosePaginate);

EmployeeSchema.virtual('employeeId').get(function (this: Employee): string {
  return this._id.toString();
});

export type EmployeeDocument = HydratedDocument<Employee>;
export type EmployeeModel = PaginateModel<EmployeeDocument>;
