import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Model } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { IssueUserType, IssueStatus, IssueLevel, IssueCategory } from './issue.enums';

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

  @Prop({ required: true, type: String, enum: Object.values(IssueUserType) })
  fromUserType: IssueUserType; // Тип сущности

  @Prop({ type: Number, required: true })
  fromTelegramId: number;
  
  @Prop({
    type: Types.ObjectId,
    required: true,
    refPath: 'fromUserType' // <-- динамическая ссылка!
  })
  from: Types.ObjectId;

  @Prop({ type: String, minlength: 10, maxlength: 5000, required: true })
  issueText: string;

  @Prop({ type: String, enum: Object.values(IssueStatus), default: IssueStatus.NEW, required: true})
  status: IssueStatus;

  @Prop({ type: String, enum: Object.values(IssueLevel), default: IssueLevel.LOW, required: false })
  level: IssueLevel;

  @Prop({ type: String, enum: Object.values(IssueCategory), default: null, required: false })
  category?: IssueCategory | null;

  @Prop({ type: String, default: null })
  resolution: string | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);
IssueSchema.plugin(mongooseLeanVirtuals as any);
IssueSchema.plugin(mongoosePaginate);

IssueSchema.virtual('issueId').get(function (this: Issue): string {
  return this._id.toString();
});

export type IssueModel = Model<Issue>;