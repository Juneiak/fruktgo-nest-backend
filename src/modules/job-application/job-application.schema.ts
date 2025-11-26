import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { JobApplicationStatus } from './job-application.enums';
import { Seller } from 'src/modules/seller/seller.schema';
import { Employee } from 'src/modules/employee';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class JobApplicationEmployee {
  @Prop({ type: Types.ObjectId, required: true, ref: Employee.name })
  employeeId: Types.ObjectId;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: true })
  employeePhone: string;
}
export const JobApplicationEmployeeSchema = SchemaFactory.createForClass(JobApplicationEmployee);

@Schema({ _id: false })
export class JobApplicationSeller {
  @Prop({ type: Types.ObjectId, required: true, ref: Seller.name })
  sellerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  sellerCompanyName: string;
}
export const JobApplicationSellerSchema = SchemaFactory.createForClass(JobApplicationSeller);

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class JobApplication {
  _id: Types.ObjectId;
  readonly jobApplicationId: string;
  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: JobApplicationEmployeeSchema, required: true })
  employee: JobApplicationEmployee;

  @Prop({ type: JobApplicationSellerSchema, required: true })
  seller: JobApplicationSeller;

  @Prop({ type: String, enum: Object.values(JobApplicationStatus), required: true, default: JobApplicationStatus.PENDING })
  status: JobApplicationStatus;
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.plugin(mongooseLeanVirtuals as any);
JobApplicationSchema.plugin(mongoosePaginate);

JobApplicationSchema.virtual('jobApplicationId').get(function (this: JobApplication): string {
  return this._id.toString();
});

export type JobApplicationDocument = HydratedDocument<JobApplication>;
export type JobApplicationModel = PaginateModel<JobApplicationDocument>;