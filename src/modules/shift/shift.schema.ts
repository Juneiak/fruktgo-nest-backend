import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types, Schema as MongooseSchema } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ActorType, ShiftEventType, ShiftStatus } from './shift.enums';
import { Shop } from '../shop/shop.schema';

// Актор (кто совершил действие)
const ActorSchema = {
  actorType: { type: String, enum: Object.values(ActorType), required: true },
  actorId: { type: Types.ObjectId, required: true, refPath: 'actorType' },
  actorName: { type: String, required: true },
  _id: false,
};
export interface Actor {
  actorType: ActorType;
  actorId: Types.ObjectId;
  actorName: string;
}

// SLA-снепшот на момент открытия смены
const SlaSnapshotSchema = {
  acceptanceTimeLimit: { type: Number, min: 0, required: true }, // сек
  assemblyTimeLimit:   { type: Number, min: 0, required: true }, // сек
  minOrderSum: { type: Number, min: 0, required: true },
  openAt: { type: Date, required: true },
  closedAt: { type: Date, required: true },
  _id: false,
};
export interface SlaSnapshot {
  acceptanceTimeLimit: number;
  assemblyTimeLimit: number;
  minOrderSum: number;
  openAt: Date;
  closedAt: Date;
}

// Агрегаты по смене
const StatisticsSchema = {
  ordersCount: { type: Number, min: 0, default: 0 },
  deliveredOrdersCount: { type: Number, min: 0, default: 0 },
  canceledOrdersCount: { type: Number, min: 0, default: 0 },
  declinedOrdersCount: { type: Number, min: 0, default: 0 },
  totalIncome: { type: Number, min: 0, default: 0 },
  declinedIncome: { type: Number, min: 0, default: 0 },
  avgOrderPrice: { type: Number, min: 0, default: 0 },
  avgOrderAcceptanceDuration: { type: Number, min: 0, default: 0 }, // сек
  avgOrderAssemblyDuration: { type: Number, min: 0, default: 0 }, // сек
  _id: false,
};
export interface Statistics {
  ordersCount: number;
  deliveredOrdersCount: number;
  canceledOrdersCount: number;
  declinedOrdersCount: number;
  totalIncome: number;
  declinedIncome: number;
  avgOrderPrice: number;
  avgOrderAcceptanceDuration: number;
  avgOrderAssemblyDuration: number;
}

// Журнал событий смены
const EventSchema = {
  type: { type: String, enum: Object.values(ShiftEventType), required: true },
  at: { type: Date, default: () => new Date(), required: true },
  by: { type: ActorSchema, required: true },
  comment: { type: String, default: null },
  payload: { type: MongooseSchema.Types.Mixed, default: {} },
  _id: false,
};
export interface ShiftEvent {
  type: ShiftEventType;
  at: Date;
  by: Actor;
  comment?: string | null;
  payload?: Record<string, unknown>;
}

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
  readonly shiftId?: string;

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
  @Prop({ type: StatisticsSchema, required: true, default: {} })
  statistics: Statistics;

  @Prop({ type: ActorSchema, required: true })
  openedBy: Actor;

  @Prop({ type: Date, required: true })
  openedAt: Date;

  @Prop({ type: ActorSchema, required: false, default: null })
  closedBy: Actor | null;

  @Prop({ type: Date, required: false, default: null })
  closedAt: Date | null;

  // Журнал событий
  @Prop({ type: [EventSchema], default: [] })
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