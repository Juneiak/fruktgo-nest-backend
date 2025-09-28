import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { PaginateModel } from 'mongoose';
import { UserType } from "src/common/enums/common.enum";
import { LogEntityType, LogLevel } from '../log.enums';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  discriminatorKey: 'entityType',
})
export class Log {
  _id: Types.ObjectId;
  readonly logId?: string;

  @Prop({ type: String, enum: Object.values(LogEntityType), required: true })
  entityType: LogEntityType;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'entityType' })
  entityId: Types.ObjectId;

  @Prop({ type: [String], enum: Object.values(UserType), default: [UserType.ADMIN] })
  forRoles: UserType[];

  @Prop({ type: String, enum: Object.values(LogLevel), default: LogLevel.LOW, required: true })
  logLevel: LogLevel;

  @Prop({ type: String, required: true })
  text: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);
LogSchema.plugin(mongooseLeanVirtuals as any);
LogSchema.plugin(mongoosePaginate);

// Виртуальное поле для ID
LogSchema.virtual('logId').get(function (this: Log) {
  return this._id.toString();
});

// Индексы для производительности
LogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
LogSchema.index({ logLevel: 1, createdAt: -1 });

export type LogDocument = Log & Document;
export type LogModel = PaginateModel<LogDocument>;
