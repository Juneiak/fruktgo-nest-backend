import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { ReceivingStatus, ReceivingType } from './receiving.enums';
import { LocationType } from '../../batch-location/batch-location.enums';

// ═══════════════════════════════════════════════════════════════
// ПОДСХЕМА: Позиция приёмки
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ReceivingItem {
  /** Product ID */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  product: Types.ObjectId;

  /** Ожидаемое количество (из накладной) */
  @Prop({ type: Number, required: true, min: 0 })
  expectedQuantity: number;

  /** Фактическое количество (после проверки) */
  @Prop({ type: Number, min: 0 })
  actualQuantity?: number;

  /** Срок годности */
  @Prop({ type: Date, required: true })
  expirationDate: Date;

  /** Дата производства */
  @Prop({ type: Date })
  productionDate?: Date;

  /** Номер партии от поставщика */
  @Prop({ type: String })
  supplierBatchNumber?: string;

  /** Закупочная цена за единицу */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** ID созданной партии (после подтверждения) */
  @Prop({ type: Types.ObjectId })
  createdBatchId?: Types.ObjectId;

  /** Комментарий (расхождение, качество) */
  @Prop({ type: String })
  comment?: string;

  /** Фото товара при приёмке */
  @Prop({ type: [String], default: [] })
  photos: string[];
}

export const ReceivingItemSchema = SchemaFactory.createForClass(ReceivingItem);

// ═══════════════════════════════════════════════════════════════
// ОСНОВНАЯ СХЕМА RECEIVING
// ═══════════════════════════════════════════════════════════════

@Schema({
  collection: 'new_inventory_receivings',
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Receiving {
  _id: Types.ObjectId;
  readonly receivingId?: string;
  createdAt: Date;
  updatedAt: Date;

  // ═══════════════════════════════════════════════════════════════
  // ВЛАДЕЛЕЦ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: Types.ObjectId, required: true, index: true })
  seller: Types.ObjectId;

  // ═══════════════════════════════════════════════════════════════
  // ДОКУМЕНТ
  // ═══════════════════════════════════════════════════════════════

  /** Номер документа */
  @Prop({ type: String, required: true, index: true })
  documentNumber: string;

  /** Тип приёмки */
  @Prop({
    type: String,
    enum: Object.values(ReceivingType),
    default: ReceivingType.SUPPLIER,
  })
  type: ReceivingType;

  /** Статус */
  @Prop({
    type: String,
    enum: Object.values(ReceivingStatus),
    default: ReceivingStatus.DRAFT,
    index: true,
  })
  status: ReceivingStatus;

  // ═══════════════════════════════════════════════════════════════
  // ЛОКАЦИЯ НАЗНАЧЕНИЯ
  // ═══════════════════════════════════════════════════════════════

  @Prop({
    type: String,
    enum: Object.values(LocationType),
    required: true,
  })
  destinationType: LocationType;

  @Prop({ type: Types.ObjectId, index: true })
  destinationShop?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, index: true })
  destinationWarehouse?: Types.ObjectId;

  /** Название локации (денормализация) */
  @Prop({ type: String })
  destinationName?: string;

  // ═══════════════════════════════════════════════════════════════
  // ПОСТАВЩИК
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  supplier?: string;

  @Prop({ type: String })
  supplierInvoice?: string;

  @Prop({ type: Date })
  supplierInvoiceDate?: Date;

  // ═══════════════════════════════════════════════════════════════
  // ПОЗИЦИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: [ReceivingItemSchema], required: true, default: [] })
  items: ReceivingItem[];

  // ═══════════════════════════════════════════════════════════════
  // СУММЫ
  // ═══════════════════════════════════════════════════════════════

  /** Общая сумма закупки */
  @Prop({ type: Number, min: 0 })
  totalAmount?: number;

  // ═══════════════════════════════════════════════════════════════
  // УЧАСТНИКИ
  // ═══════════════════════════════════════════════════════════════

  /** Кто создал */
  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  /** Кто подтвердил */
  @Prop({ type: Types.ObjectId })
  confirmedBy?: Types.ObjectId;

  /** Дата подтверждения */
  @Prop({ type: Date })
  confirmedAt?: Date;

  // ═══════════════════════════════════════════════════════════════
  // КОММЕНТАРИИ
  // ═══════════════════════════════════════════════════════════════

  @Prop({ type: String })
  comment?: string;

  /** Фото накладной/документов */
  @Prop({ type: [String], default: [] })
  documentPhotos: string[];
}

export const ReceivingSchema = SchemaFactory.createForClass(Receiving);

// ═══════════════════════════════════════════════════════════════
// ИНДЕКСЫ
// ═══════════════════════════════════════════════════════════════

ReceivingSchema.index({ seller: 1, status: 1 });
ReceivingSchema.index({ seller: 1, documentNumber: 1 }, { unique: true });
ReceivingSchema.index({ seller: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// ВИРТУАЛЬНЫЕ ПОЛЯ
// ═══════════════════════════════════════════════════════════════

ReceivingSchema.virtual('receivingId').get(function () {
  return this._id?.toHexString();
});

/** ID локации */
ReceivingSchema.virtual('destinationId').get(function () {
  return this.destinationType === LocationType.SHOP
    ? this.destinationShop
    : this.destinationWarehouse;
});

/** Количество позиций */
ReceivingSchema.virtual('itemsCount').get(function () {
  return this.items?.length || 0;
});

// ═══════════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════════

export type ReceivingDocument = HydratedDocument<Receiving>;
export type ReceivingModel = Model<Receiving>;
