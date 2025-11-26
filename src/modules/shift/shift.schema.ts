import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types, Schema as MongooseSchema } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ActorType, ShiftEventType, ShiftStatus } from './shift.enums';
import { Shop } from '../shop/shop.schema';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ShiftActor {
  @Prop({ type: String, enum: Object.values(ActorType), required: true })
  actorType: ActorType;

  @Prop({ type: Types.ObjectId, required: true, refPath: 'actorType' })
  actorId: Types.ObjectId;

  @Prop({ type: String, required: true })
  actorName: string;
}
export const ShiftActorSchema = SchemaFactory.createForClass(ShiftActor);

@Schema({ _id: false })
export class SlaSnapshot {
  @Prop({ type: Number, min: 0, required: true })
  acceptanceTimeLimit: number; // сек

  @Prop({ type: Number, min: 0, required: true })
  assemblyTimeLimit: number; // сек

  @Prop({ type: Number, min: 0, required: true })
  minOrderSum: number;

  @Prop({ type: Date, required: true })
  openAt: Date;

  @Prop({ type: Date, required: true })
  closedAt: Date;
}
export const SlaSnapshotSchema = SchemaFactory.createForClass(SlaSnapshot);

@Schema({ _id: false })
export class ShiftStatistics {
  @Prop({ type: Number, min: 0, default: 0 })
  ordersCount: number;

  @Prop({ type: Number, min: 0, default: 0 })
  deliveredOrdersCount: number;

  @Prop({ type: Number, min: 0, default: 0 })
  canceledOrdersCount: number;

  @Prop({ type: Number, min: 0, default: 0 })
  declinedOrdersCount: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalIncome: number;

  @Prop({ type: Number, min: 0, default: 0 })
  declinedIncome: number;

  @Prop({ type: Number, min: 0, default: 0 })
  avgOrderPrice: number;

  @Prop({ type: Number, min: 0, default: 0 })
  avgOrderAcceptanceDuration: number; // сек

  @Prop({ type: Number, min: 0, default: 0 })
  avgOrderAssemblyDuration: number; // сек
}
export const ShiftStatisticsSchema = SchemaFactory.createForClass(ShiftStatistics);

@Schema({ _id: false })
export class ShiftEvent {
  @Prop({ type: String, enum: Object.values(ShiftEventType), required: true })
  type: ShiftEventType;

  @Prop({ type: Date, default: () => new Date(), required: true })
  at: Date;

  @Prop({ type: ShiftActorSchema, required: true })
  by: ShiftActor;

  @Prop({ type: String, default: null })
  comment?: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload?: Record<string, unknown>;
}
export const ShiftEventSchema = SchemaFactory.createForClass(ShiftEvent);

// =============================
// Shift schema (минимальное ядро + события + снепшоты)
// =============================
@Schema({
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Shift {

  _id: Types.ObjectId;
  shiftId?: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Types.ObjectId, ref: Shop.name, required: true })
  shop: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(ShiftStatus), required: true, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  // Снэпшот SLA на момент открытия (для стабильной аналитики)
  @Prop({ type: SlaSnapshotSchema, required: true })
  sla: SlaSnapshot;

  // Агрегаты
  @Prop({ type: ShiftStatisticsSchema, required: true, default: {} })
  statistics: ShiftStatistics;

  @Prop({ type: ShiftActorSchema, required: true })
  openedBy: ShiftActor;

  @Prop({ type: Date, required: true })
  openedAt: Date;

  @Prop({ type: ShiftActorSchema, required: false, default: null })
  closedBy: ShiftActor | null;

  @Prop({ type: Date, required: false, default: null })
  closedAt: Date | null;

  // Журнал событий
  @Prop({ type: [ShiftEventSchema], default: [] })
  events: ShiftEvent[];
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

// Плагины
ShiftSchema.plugin(mongooseLeanVirtuals as any);
ShiftSchema.plugin(mongoosePaginate);

// Виртуал на id
ShiftSchema.virtual('shiftId').get(function (this: Shift): string {
  return this._id.toString();
});

// =============================
// Единственный индекс: не более 1 активной смены на магазин
// =============================
ShiftSchema.index(
  { shop: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: [ShiftStatus.OPEN, ShiftStatus.CLOSING] } },
    name: 'uniq_open_or_closing_per_shop',
  }
);

export type ShiftDocument = HydratedDocument<Shift>;
export type ShiftModel = PaginateModel<ShiftDocument>;