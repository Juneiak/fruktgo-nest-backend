import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ProductBatch } from 'src/modules/product-batch/product-batch.schema';
import { Shop } from 'src/modules/shop/shop.schema';
import { Warehouse } from 'src/modules/warehouse/warehouse.schema';
import { ShopProduct } from 'src/modules/shop-product/shop-product.schema';
import { WarehouseProduct } from 'src/modules/warehouse-product/warehouse-product.schema';
import { BatchStockLocationType, BatchStockStatus } from './batch-stock.enums';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class BatchStock {
  _id: Types.ObjectId;
  readonly batchStockId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Партия товара */
  @Prop({ type: Types.ObjectId, ref: ProductBatch.name, required: true, index: true })
  batch: Types.ObjectId | ProductBatch;

  /** Тип локации */
  @Prop({ 
    type: String, 
    enum: Object.values(BatchStockLocationType), 
    required: true 
  })
  locationType: BatchStockLocationType;

  /** Магазин (если locationType = SHOP) */
  @Prop({ type: Types.ObjectId, ref: Shop.name, index: true })
  shop?: Types.ObjectId;

  /** Склад (если locationType = WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: Warehouse.name, index: true })
  warehouse?: Types.ObjectId;

  /** ShopProduct (связь для быстрого поиска) */
  @Prop({ type: Types.ObjectId, ref: ShopProduct.name, index: true })
  shopProduct?: Types.ObjectId;

  /** WarehouseProduct (связь для быстрого поиска) */
  @Prop({ type: Types.ObjectId, ref: WarehouseProduct.name, index: true })
  warehouseProduct?: Types.ObjectId;

  /** Текущий остаток партии в этой локации */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  quantity: number;

  /** Зарезервировано (под заказы или перемещения) */
  @Prop({ type: Number, min: 0, required: true, default: 0 })
  reservedQuantity: number;

  /** Статус */
  @Prop({ 
    type: String, 
    enum: Object.values(BatchStockStatus), 
    default: BatchStockStatus.ACTIVE, 
    required: true 
  })
  status: BatchStockStatus;
}

export const BatchStockSchema = SchemaFactory.createForClass(BatchStock);
BatchStockSchema.plugin(mongooseLeanVirtuals as any);
BatchStockSchema.plugin(mongoosePaginate);

// Virtuals
BatchStockSchema.virtual('batchStockId').get(function (this: BatchStock): string {
  return this._id.toString();
});

/** Доступное количество */
BatchStockSchema.virtual('availableQuantity').get(function (this: BatchStock): number {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

// Indexes
// Уникальность: одна партия в одной локации
BatchStockSchema.index(
  { batch: 1, locationType: 1, shop: 1, warehouse: 1 }, 
  { unique: true }
);

// Быстрый поиск активных партий в локации для FIFO
BatchStockSchema.index({ shop: 1, status: 1, quantity: 1 });
BatchStockSchema.index({ warehouse: 1, status: 1, quantity: 1 });
BatchStockSchema.index({ shopProduct: 1, status: 1 });
BatchStockSchema.index({ warehouseProduct: 1, status: 1 });

export type BatchStockDocument = HydratedDocument<BatchStock>;
export type BatchStockModel = PaginateModel<BatchStockDocument>;
