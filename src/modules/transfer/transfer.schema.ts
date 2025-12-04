import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { TransferStatus, TransferLocationType } from './transfer.enums';

// ═══════════════════════════════════════════════════════════════
// TRANSFER ITEM (Embedded)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class TransferItem {
  /** ShopProduct ID (если источник - Shop) */
  @Prop({ type: Types.ObjectId })
  shopProduct?: Types.ObjectId;

  /** WarehouseProduct ID (если источник - Warehouse) */
  @Prop({ type: Types.ObjectId })
  warehouseProduct?: Types.ObjectId;

  /** Product ID (для сопоставления при приёмке в другой тип точки) */
  @Prop({ type: Types.ObjectId, required: true })
  product: Types.ObjectId;

  @Prop({ type: Number, min: 1, required: true })
  quantity: number;

  @Prop({ type: String })
  comment?: string;
}

export const TransferItemSchema = SchemaFactory.createForClass(TransferItem);

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Transfer {
  _id: Types.ObjectId;
  readonly transferId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Номер документа (TR-YYYYMMDD-XXXX) */
  @Prop({ type: String, required: true, unique: true })
  documentNumber: string;

  /** Тип источника */
  @Prop({ 
    type: String, 
    enum: Object.values(TransferLocationType), 
    default: TransferLocationType.SHOP, 
    required: true 
  })
  sourceType: TransferLocationType;

  /** Тип получателя */
  @Prop({ 
    type: String, 
    enum: Object.values(TransferLocationType), 
    default: TransferLocationType.SHOP, 
    required: true 
  })
  targetType: TransferLocationType;

  /** Магазин-отправитель (если sourceType = SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop' })
  sourceShop?: Types.ObjectId;

  /** Склад-отправитель (если sourceType = WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  sourceWarehouse?: Types.ObjectId;

  /** Магазин-получатель (если targetType = SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop' })
  targetShop?: Types.ObjectId;

  /** Склад-получатель (если targetType = WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  targetWarehouse?: Types.ObjectId;

  /** Статус документа */
  @Prop({ 
    type: String, 
    enum: Object.values(TransferStatus), 
    default: TransferStatus.DRAFT, 
    required: true 
  })
  status: TransferStatus;

  /** Позиции для перемещения */
  @Prop({ type: [TransferItemSchema], default: [] })
  items: TransferItem[];

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;

  /** Кто создал документ */
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  createdBy: Types.ObjectId;

  /** Кто отправил (подтвердил отправку) */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  sentBy?: Types.ObjectId;

  /** Дата отправки */
  @Prop({ type: Date })
  sentAt?: Date;

  /** Кто принял */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  receivedBy?: Types.ObjectId;

  /** Дата приёма */
  @Prop({ type: Date })
  receivedAt?: Date;

  /** Кто отменил */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  cancelledBy?: Types.ObjectId;

  /** Дата отмены */
  @Prop({ type: Date })
  cancelledAt?: Date;

  /** Причина отмены */
  @Prop({ type: String })
  cancelReason?: string;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);
TransferSchema.plugin(mongooseLeanVirtuals as any);
TransferSchema.plugin(mongoosePaginate);

TransferSchema.virtual('transferId').get(function (this: Transfer): string {
  return this._id.toString();
});

// Индексы
TransferSchema.index({ sourceShop: 1, status: 1 });
TransferSchema.index({ targetShop: 1, status: 1 });
TransferSchema.index({ sourceWarehouse: 1, status: 1 });
TransferSchema.index({ targetWarehouse: 1, status: 1 });
TransferSchema.index({ documentNumber: 1 });
TransferSchema.index({ createdAt: -1 });

export type TransferDocument = HydratedDocument<Transfer>;
export type TransferModel = PaginateModel<TransferDocument>;
