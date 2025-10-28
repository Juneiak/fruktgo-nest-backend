import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { JobApplicationStatus } from './job-application.enums';
import { Seller } from 'src/modules/seller/seller.schema';
import { Employee } from 'src/modules/employee';

const JobApplicationEmployeeSchema = {
  employeeId: { type: Types.ObjectId, required: true, ref: Employee.name },
  employeeName: { type: String, required: true },
  employeePhone: { type: String, required: true },
  _id: false,
};
export interface JobApplicationEmployee {
  employeeId: Types.ObjectId;
  employeeName: string;
  employeePhone: string;
}

const JobApplicationSellerSchema = {
  sellerId: { type: Types.ObjectId, required: true, ref: Seller.name },
  sellerCompanyName: { type: String, required: true },
  _id: false,
};
export interface JobApplicationSeller {
  sellerId: Types.ObjectId;
  sellerCompanyName: string;
}

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