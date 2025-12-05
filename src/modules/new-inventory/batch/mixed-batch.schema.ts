import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';

/**
 * Причина создания смешанной партии
 */
export enum MixedBatchReason {
  /** Автоконсолидация мелких остатков */
  AUTO_CONSOLIDATION = 'AUTO_CONSOLIDATION',
  /** Консолидация при инвентаризации */
  AUDIT_CONSOLIDATION = 'AUDIT_CONSOLIDATION',
  /** Обнаружен смешанный товар */
  FOUND_MIXED = 'FOUND_MIXED',
}

/**
 * Компонент смешанной партии
 */
@Schema({ _id: false })
export class MixedBatchComponent {
  /** Исходная партия */
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  /** Количество из этой партии */
  @Prop({ type: Number, min: 0, required: true })
  quantity: number;

  /** Свежесть партии на момент смешивания (0-10) */
  @Prop({ type: Number, min: 0, max: 10 })
  freshnessAtMixing?: number;

  /** Дата истечения исходной партии */
  @Prop({ type: Date })
  originalExpirationDate?: Date;
}
export const MixedBatchComponentSchema =
  SchemaFactory.createForClass(MixedBatchComponent);

/**
 * MixedBatch — смешанная партия
 *
 * Создаётся автоматически при консолидации мелких остатков
 * или при обнаружении смешанного товара на инвентаризации.
 *
 * Правила:
 * - effectiveExpirationDate = MIN из всех компонентов
 * - effectiveFreshness = средневзвешенная свежесть
 * - Для трассировки хранятся все исходные партии
 */
@Schema({
  timestamps: true,
  collection: 'inventory_mixed_batches',
})
export class MixedBatch {
  _id: Types.ObjectId;

  /** Продавец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Товар */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  /** Локация, где произошло смешивание */
  @Prop({ type: Types.ObjectId, ref: 'StorageLocation', required: true, index: true })
  location: Types.ObjectId;

  /** Компоненты (исходные партии) */
  @Prop({ type: [MixedBatchComponentSchema], required: true })
  components: MixedBatchComponent[];

  /** Общее количество */
  @Prop({ type: Number, min: 0, required: true })
  totalQuantity: number;

  /** Эффективная дата истечения (MIN из всех) */
  @Prop({ type: Date, required: true, index: true })
  effectiveExpirationDate: Date;

  /** Эффективная свежесть (средневзвешенная) */
  @Prop({ type: Number, min: 0, max: 10, default: 5 })
  effectiveFreshness: number;

  /** Причина создания */
  @Prop({
    type: String,
    enum: Object.values(MixedBatchReason),
    required: true,
  })
  reason: MixedBatchReason;

  /** Связанная инвентаризация (если консолидация при аудите) */
  @Prop({ type: Types.ObjectId, ref: 'Audit' })
  audit?: Types.ObjectId;

  /** Кто создал (сотрудник или система) */
  @Prop({ type: Types.ObjectId, ref: 'Employee' })
  createdBy?: Types.ObjectId;

  /** Заметки */
  @Prop({ type: String })
  notes?: string;

  /** Активна ли партия (false = полностью израсходована) */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type MixedBatchDocument = HydratedDocument<MixedBatch>;
export type MixedBatchModel = Model<MixedBatch>;

export const MixedBatchSchema = SchemaFactory.createForClass(MixedBatch);

// Индексы
MixedBatchSchema.index({ seller: 1, product: 1, isActive: 1 });
MixedBatchSchema.index({ location: 1, isActive: 1 });
MixedBatchSchema.index({ effectiveExpirationDate: 1 });
MixedBatchSchema.index({ 'components.batch': 1 });
