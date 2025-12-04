import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PaginateModel, HydratedDocument, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { Seller } from 'src/modules/seller/seller.schema';
import { Product } from 'src/modules/product/product.schema';
import { ProductBatchStatus, ExpirationAlertLevel } from './product-batch.enums';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class ProductBatch {
  _id: Types.ObjectId;
  readonly batchId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Владелец (продавец) */
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true, index: true })
  seller: Types.ObjectId;

  /** Товар */
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true, index: true })
  product: Types.ObjectId | Product;

  /** Номер партии (генерируется или из накладной) */
  @Prop({ type: String, required: true })
  batchNumber: string;

  /** Дата производства */
  @Prop({ type: Date })
  productionDate?: Date;

  /** Срок годности (критичное поле!) */
  @Prop({ type: Date, required: true, index: true })
  expirationDate: Date;

  /** Поставщик (название или ID) */
  @Prop({ type: String })
  supplier?: string;

  /** Номер накладной поставщика */
  @Prop({ type: String })
  supplierInvoice?: string;

  /** Закупочная цена (для анализа маржи) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** Начальное количество при приёмке */
  @Prop({ type: Number, min: 0, required: true })
  initialQuantity: number;

  /** Статус партии */
  @Prop({ 
    type: String, 
    enum: Object.values(ProductBatchStatus), 
    default: ProductBatchStatus.ACTIVE, 
    required: true,
    index: true,
  })
  status: ProductBatchStatus;

  /** Причина блокировки (если status = BLOCKED) */
  @Prop({ type: String })
  blockReason?: string;

  /** Внешний код (для импорта из 1С) */
  @Prop({ type: String, sparse: true })
  externalCode?: string;

  /** Комментарий */
  @Prop({ type: String })
  comment?: string;
}

export const ProductBatchSchema = SchemaFactory.createForClass(ProductBatch);
ProductBatchSchema.plugin(mongooseLeanVirtuals as any);
ProductBatchSchema.plugin(mongoosePaginate);

// Virtuals
ProductBatchSchema.virtual('batchId').get(function (this: ProductBatch): string {
  return this._id.toString();
});

/** Дней до истечения срока */
ProductBatchSchema.virtual('daysUntilExpiration').get(function (this: ProductBatch): number {
  const now = new Date();
  const diff = this.expirationDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/** Уровень алерта по сроку годности */
ProductBatchSchema.virtual('expirationAlertLevel').get(function (this: ProductBatch): ExpirationAlertLevel {
  const days = Math.ceil((this.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return ExpirationAlertLevel.EXPIRED;
  if (days <= 3) return ExpirationAlertLevel.CRITICAL;
  if (days <= 7) return ExpirationAlertLevel.WARNING;
  return ExpirationAlertLevel.NORMAL;
});

// Indexes
ProductBatchSchema.index({ seller: 1, batchNumber: 1 }, { unique: true });
ProductBatchSchema.index({ seller: 1, product: 1, expirationDate: 1 }); // Для FIFO
ProductBatchSchema.index({ expirationDate: 1, status: 1 }); // Для поиска истекающих

export type ProductBatchDocument = HydratedDocument<ProductBatch>;
export type ProductBatchModel = PaginateModel<ProductBatchDocument>;
