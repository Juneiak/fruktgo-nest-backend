import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Warehouse } from 'src/modules/warehouse/warehouse.schema';
import { Product } from 'src/modules/product/product.schema';
import { WarehouseProductStatus } from './warehouse-product.enums';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class WarehouseProduct {
  _id: Types.ObjectId;
  readonly warehouseProductId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Склад */
  @Prop({ type: Types.ObjectId, ref: Warehouse.name, required: true, index: true })
  warehouse: Types.ObjectId;

  /** Товар */
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId | Product;

  /** Остаток на складе */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  stockQuantity: number;

  /** Зарезервированное количество (для Transfer в процессе) */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  reservedQuantity: number;

  /** Статус */
  @Prop({ 
    type: String, 
    enum: Object.values(WarehouseProductStatus), 
    default: WarehouseProductStatus.ACTIVE, 
    required: true 
  })
  status: WarehouseProductStatus;

  /** Внешний код (для импорта из 1С) */
  @Prop({ type: String, index: true, sparse: true })
  externalCode?: string;

  /** Минимальный остаток для уведомления */
  @Prop({ type: Number, min: 0, default: 0 })
  minStockLevel?: number;
}

export const WarehouseProductSchema = SchemaFactory.createForClass(WarehouseProduct);
WarehouseProductSchema.plugin(mongooseLeanVirtuals as any);
WarehouseProductSchema.plugin(mongoosePaginate);

WarehouseProductSchema.virtual('warehouseProductId').get(function (this: WarehouseProduct): string {
  return this._id.toString();
});

/** Доступное количество = stockQuantity - reservedQuantity */
WarehouseProductSchema.virtual('availableQuantity').get(function (this: WarehouseProduct): number {
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
});

// Уникальность: один товар на одном складе
WarehouseProductSchema.index({ warehouse: 1, product: 1 }, { unique: true });

// Индекс для быстрого поиска по внешнему коду
WarehouseProductSchema.index({ warehouse: 1, externalCode: 1 }, { sparse: true });

export type WarehouseProductDocument = HydratedDocument<WarehouseProduct>;
export type WarehouseProductModel = PaginateModel<WarehouseProductDocument>;
