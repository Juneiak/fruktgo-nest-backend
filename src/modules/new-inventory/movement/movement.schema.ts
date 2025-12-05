import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  MovementType,
  MovementDocumentType,
  MovementActorType,
} from './movement.enums';
import { LocationType } from '../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Ссылка на документ
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class MovementDocumentRef {
  @Prop({
    type: String,
    enum: Object.values(MovementDocumentType),
    required: true,
  })
  type: MovementDocumentType;

  @Prop({ type: Types.ObjectId, required: true })
  id: Types.ObjectId;

  @Prop({ type: String })
  documentNumber?: string;
}

export const MovementDocumentRefSchema =
  SchemaFactory.createForClass(MovementDocumentRef);

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Актор
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class MovementActor {
  @Prop({
    type: String,
    enum: Object.values(MovementActorType),
    required: true,
  })
  type: MovementActorType;

  @Prop({ type: Types.ObjectId })
  id?: Types.ObjectId;

  @Prop({ type: String })
  name?: string;
}

export const MovementActorSchema = SchemaFactory.createForClass(MovementActor);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА MOVEMENT
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_movements',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Movement {
  _id: Types.ObjectId;
  readonly movementId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ТИП ДВИЖЕНИЯ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(MovementType),
    required: true,
    index: true,
  })
  type: MovementType;

  // ═══════════════════════════════════════════════════════════════
  // ПАРТИЯ И ПРОДУКТ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  batch: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  batchLocation?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ЛОКАЦИЯ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  locationType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  shop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  warehouse?: Types.ObjectId;

  @Prop({ type: String })
  locationName?: string;

  // ═══════════════════════════════════════════════════════════════
  // КОЛИЧЕСТВО
  // ═══════════════════════════════════════════════════════════════

  /** Изменение количества (+/-) */
  @Prop({ type: Number, required: true })
  quantityChange: number;

  /** Остаток партии в локации ДО */
  @Prop({ type: Number, required: true })
  balanceBefore: number;

  /** Остаток партии в локации ПОСЛЕ */
  @Prop({ type: Number, required: true })
  balanceAfter: number;

  /** Зарезервировано ДО (для резервов) */
  @Prop({ type: Number })
  reservedBefore?: number;

  /** Зарезервировано ПОСЛЕ */
  @Prop({ type: Number })
  reservedAfter?: number;

  // ═══════════════════════════════════════════════════════════════
  // ДОКУМЕНТ-ИСТОЧНИК
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: MovementDocumentRefSchema })
  document?: MovementDocumentRef;

  // ═══════════════════════════════════════════════════════════════
  // АКТОР
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: MovementActorSchema, required: true })
  actor: MovementActor;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИЙ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;
}

export const MovementSchema = SchemaFactory.createForClass(Movement);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

MovementSchema.index({ seller: 1, createdAt: -1 });
MovementSchema.index({ batch: 1, createdAt: -1 });
MovementSchema.index({ product: 1, createdAt: -1 });
MovementSchema.index({ 'document.type': 1, 'document.id': 1 });
MovementSchema.index({ shop: 1, createdAt: -1 }, { sparse: true });
MovementSchema.index({ warehouse: 1, createdAt: -1 }, { sparse: true });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

MovementSchema.virtual('movementId').get(function () {
  return this._id?.toHexString();
});

MovementSchema.virtual('locationId').get(function () {
  return this.locationType === LocationType.SHOP ? this.shop : this.warehouse;
});

MovementSchema.virtual('isIncome').get(function () {
  return this.quantityChange > 0;
});

MovementSchema.virtual('isExpense').get(function () {
  return this.quantityChange < 0;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type MovementDocument = HydratedDocument<Movement>;
export type MovementModel = Model<Movement>;
