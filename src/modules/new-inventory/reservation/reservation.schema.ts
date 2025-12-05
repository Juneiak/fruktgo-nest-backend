import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  ReservationStatus,
  ReservationCancelReason,
  ReservationType,
} from './reservation.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция резервирования
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ReservationItem {
  /** Партия */
  @Prop({ type: Types.ObjectId, required: true })
  batch: Types.ObjectId;

  /** BatchLocation */
  @Prop({ type: Types.ObjectId, required: true })
  batchLocation: Types.ObjectId;

  /** Product ID */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  /** Зарезервированное количество */
  @Prop({ type: Number, required: true, min: 0.001 })
  quantity: number;

  /** Фактически выданное количество (при сборке) */
  @Prop({ type: Number, min: 0 })
  confirmedQuantity?: number;

  /** Статус позиции */
  @Prop({
    type: String,
    enum: Object.values(ReservationStatus),
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  /** Срок годности партии на момент резерва */
  @Prop({ type: Date })
  batchExpirationDate?: Date;

  /** Свежесть партии на момент резерва */
  @Prop({ type: Number })
  batchFreshnessRemaining?: number;
}

export const ReservationItemSchema =
  SchemaFactory.createForClass(ReservationItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА RESERVATION
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_reservations',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Reservation {
  _id: Types.ObjectId;
  readonly reservationId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ЗАКАЗ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  order: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  customer?: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // МАГАЗИН
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  shop: Types.ObjectId;

  @Prop({ type: String })
  shopName?: string;

  // ═══════════════════════════════════════════════════════════════
  // ТИП И СТАТУС
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(ReservationType),
    default: ReservationType.ORDER,
  })
  type: ReservationType;

  @Prop({
    type: String,
    enum: Object.values(ReservationStatus),
    default: ReservationStatus.ACTIVE,
    index: true,
  })
  status: ReservationStatus;

  // ═══════════════════════════════════════════════════════════════
  // ВРЕМЯ ЖИЗНИ
  // ═══════════════════════════════════════════════════════════════

  /** Время истечения резерва */
  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;

  /** Время подтверждения */
  @Prop({ type: Date })
  confirmedAt?: Date;

  /** Время отмены */
  @Prop({ type: Date })
  cancelledAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [ReservationItemSchema], required: true, default: [] })
  items: ReservationItem[];

  // ═══════════════════════════════════════════════════════════════
  // ОТМЕНА
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String, enum: Object.values(ReservationCancelReason) })
  cancelReason?: ReservationCancelReason;

  @Prop({ type: String })
  cancelComment?: string;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

ReservationSchema.index({ seller: 1, status: 1 });
ReservationSchema.index({ shop: 1, status: 1 });
ReservationSchema.index({ order: 1 }, { unique: true });
ReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL для expired

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

ReservationSchema.virtual('reservationId').get(function () {
  return this._id?.toHexString();
});

ReservationSchema.virtual('itemsCount').get(function () {
  return this.items?.length || 0;
});

ReservationSchema.virtual('totalQuantity').get(function () {
  return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
});

ReservationSchema.virtual('isExpired').get(function () {
  return (
    this.status === ReservationStatus.ACTIVE &&
    this.expiresAt &&
    this.expiresAt < new Date()
  );
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type ReservationDocument = HydratedDocument<Reservation>;
export type ReservationModel = Model<Reservation>;
