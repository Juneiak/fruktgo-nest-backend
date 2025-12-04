import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Seller } from 'src/modules/seller/seller.schema';
import { Address } from 'src/infra/addresses';
import { WarehouseStatus } from './warehouse.enums';

// ═══════════════════════════════════════════════════════════════
// NESTED SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class WarehouseContact {
  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  contactPerson?: string;
}
export const WarehouseContactSchema = SchemaFactory.createForClass(WarehouseContact);

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Warehouse {
  _id: Types.ObjectId;
  readonly warehouseId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Владелец склада */
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true, index: true })
  seller: Types.ObjectId;

  /** Название склада */
  @Prop({ type: String, required: true })
  name: string;

  /** Код склада (для импорта из 1С) */
  @Prop({ type: String, index: true, sparse: true })
  externalCode?: string;

  /** Адрес склада (ссылка на Address) */
  @Prop({ type: Types.ObjectId, ref: Address.name, index: true })
  address?: Types.ObjectId;

  /** Контактная информация */
  @Prop({ type: WarehouseContactSchema })
  contact?: WarehouseContact;

  /** Статус склада */
  @Prop({ 
    type: String, 
    enum: Object.values(WarehouseStatus), 
    default: WarehouseStatus.ACTIVE, 
    required: true 
  })
  status: WarehouseStatus;

  /** Описание/заметки */
  @Prop({ type: String })
  description?: string;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
WarehouseSchema.plugin(mongooseLeanVirtuals as any);
WarehouseSchema.plugin(mongoosePaginate);

WarehouseSchema.virtual('warehouseId').get(function (this: Warehouse): string {
  return this._id.toString();
});

// Уникальный код в рамках продавца
WarehouseSchema.index({ seller: 1, externalCode: 1 }, { unique: true, sparse: true });

export type WarehouseDocument = HydratedDocument<Warehouse>;
export type WarehouseModel = PaginateModel<WarehouseDocument>;
