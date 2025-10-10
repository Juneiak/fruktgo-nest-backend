import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { JobApplicationStatus } from './job-application.enums';
import { Seller } from 'src/modules/seller/seller.schema';
import { Employee } from 'src/modules/employee/employee.schema';

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
  
  @Prop({ type: Types.ObjectId, ref: Employee.name, required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, required: true })
  employeePhoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  sellerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  companyName: string;

  @Prop({ type: String, enum: Object.values(JobApplicationStatus), required: true, default: JobApplicationStatus.PENDING })
  jobApplicationStatus: JobApplicationStatus;
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.plugin(mongooseLeanVirtuals as any);
JobApplicationSchema.plugin(mongoosePaginate);

JobApplicationSchema.virtual('jobApplicationId').get(function (this: JobApplication): string {
  return this._id.toString();
});

export type JobApplicationDocument = HydratedDocument<JobApplication>;
export type JobApplicationModel = PaginateModel<JobApplicationDocument>;