import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum IssueStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed'
};

export enum IssueStatusText {
  NEW = 'Новая',
  IN_PROGRESS = 'В процессе',
  CLOSED = 'Закрыта'
};

//TODO: привести к общему 
export enum IssueUserType {
  CUSTOMER = 'Customer',
  SELLER = 'Seller'
};

export enum IssueLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum IssueStatusFilter {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  CLOSED = 'closed',
  ALL = 'all',
  ACTIVE = 'active'
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Issue extends Document {

  _id: Types.ObjectId;
  issueId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, type: String, enum: IssueUserType })
  fromUserType: IssueUserType; // Тип сущности

  @Prop({ type: Number, required: true })
  fromTelegramId: number;
  
  @Prop({
    type: Types.ObjectId,
    required: true,
    refPath: 'fromUserType' // <-- динамическая ссылка!
  })
  from: Types.ObjectId;

  @Prop({ type: String, required: true })
  issueText: string;

  @Prop({ type: String, required: true, enum: IssueStatus, default: IssueStatus.NEW })
  status: IssueStatus;

  @Prop({ type: String, required: false, default: IssueLevel.LOW, enum: IssueLevel })
  level: IssueLevel;

  @Prop({ type: String, required: false, default: null })
  result?: string | null;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);
IssueSchema.plugin(mongooseLeanVirtuals as any);


IssueSchema.virtual('issueId').get(function (this: Issue): string {
  return this._id.toString();
});