import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';

export enum RequestToEmployeeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class RequestToEmployee {
  _id: Types.ObjectId;
  // virtuals (TS-объявления)
  readonly requestToEmployeeId: string;
  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  to: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  from: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(RequestToEmployeeStatus), default: RequestToEmployeeStatus.PENDING, required: true })
  requestStatus: RequestToEmployeeStatus;
}

export const RequestToEmployeeSchema = SchemaFactory.createForClass(RequestToEmployee);
RequestToEmployeeSchema.plugin(mongooseLeanVirtuals as any);
RequestToEmployeeSchema.plugin(mongoosePaginate);

RequestToEmployeeSchema.virtual('requestToEmployeeId').get(function (this: RequestToEmployee): string {
  return this._id.toString();
});

export type RequestToEmployeeDocument = HydratedDocument<RequestToEmployee>;
export type RequestToEmployeeModel = PaginateModel<RequestToEmployeeDocument>;