import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import { Employee } from './employee.schema';
import { Seller } from 'src/modules/seller/seller.schema';

export enum RequestToEmployeeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}


@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
})
export class RequestToEmployee extends Document {

  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  to: Types.ObjectId | Employee;

  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true })
  from: Types.ObjectId | Seller;

  @Prop({ type: String, enum: RequestToEmployeeStatus, default: RequestToEmployeeStatus.PENDING })
  requestStatus: RequestToEmployeeStatus;
}

export const RequestToEmployeeSchema = SchemaFactory.createForClass(RequestToEmployee);
RequestToEmployeeSchema.plugin(mongooseLeanVirtuals as any);