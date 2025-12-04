import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ImportSourceType, ImportDataType, ImportJobStatus } from './import.enums';

// ═══════════════════════════════════════════════════════════════
// IMPORT ERROR (Embedded)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ImportError {
  @Prop({ type: Number })
  row?: number;

  @Prop({ type: String })
  field?: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Object })
  data?: Record<string, any>;
}
export const ImportErrorSchema = SchemaFactory.createForClass(ImportError);

// ═══════════════════════════════════════════════════════════════
// IMPORT RESULT (Embedded)
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class ImportResult {
  @Prop({ type: Number, default: 0 })
  totalRows: number;

  @Prop({ type: Number, default: 0 })
  processedRows: number;

  @Prop({ type: Number, default: 0 })
  createdCount: number;

  @Prop({ type: Number, default: 0 })
  updatedCount: number;

  @Prop({ type: Number, default: 0 })
  skippedCount: number;

  @Prop({ type: Number, default: 0 })
  errorCount: number;

  @Prop({ type: [ImportErrorSchema], default: [] })
  errors: ImportError[];
}
export const ImportResultSchema = SchemaFactory.createForClass(ImportResult);

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB
// ═══════════════════════════════════════════════════════════════

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class ImportJob {
  _id: Types.ObjectId;
  readonly importJobId?: string;
  createdAt: Date;
  updatedAt: Date;

  /** Продавец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Тип источника данных */
  @Prop({ 
    type: String, 
    enum: Object.values(ImportSourceType), 
    required: true 
  })
  sourceType: ImportSourceType;

  /** Тип импортируемых данных */
  @Prop({ 
    type: String, 
    enum: Object.values(ImportDataType), 
    required: true 
  })
  dataType: ImportDataType;

  /** Статус задания */
  @Prop({ 
    type: String, 
    enum: Object.values(ImportJobStatus), 
    default: ImportJobStatus.PENDING, 
    required: true 
  })
  status: ImportJobStatus;

  /** Имя загруженного файла */
  @Prop({ type: String, required: true })
  fileName: string;

  /** Путь к файлу в хранилище */
  @Prop({ type: String, required: true })
  filePath: string;

  /** Целевой склад (для WAREHOUSE_STOCK) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  targetWarehouse?: Types.ObjectId;

  /** Целевой магазин (для SHOP_STOCK) */
  @Prop({ type: Types.ObjectId, ref: 'Shop' })
  targetShop?: Types.ObjectId;

  /** Результат обработки */
  @Prop({ type: ImportResultSchema, default: {} })
  result: ImportResult;

  /** Дата начала обработки */
  @Prop({ type: Date })
  startedAt?: Date;

  /** Дата завершения обработки */
  @Prop({ type: Date })
  completedAt?: Date;

  /** Кто создал задание */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  createdBy?: Types.ObjectId;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);
ImportJobSchema.plugin(mongooseLeanVirtuals as any);
ImportJobSchema.plugin(mongoosePaginate);

ImportJobSchema.virtual('importJobId').get(function (this: ImportJob): string {
  return this._id.toString();
});

// Индексы
ImportJobSchema.index({ seller: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1 });

export type ImportJobDocument = HydratedDocument<ImportJob>;
export type ImportJobModel = PaginateModel<ImportJobDocument>;
