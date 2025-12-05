import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  ProductTemplateStatus,
  PurchasePriceStrategy,
} from './product-template.enums';
import { ProductUnit } from '../inventory-product/inventory-product.enums';
import { StoragePreset } from '../../core/storage-preset';

/**
 * Настройки хранения товара
 */
@Schema({ _id: false })
export class StorageSettings {
  /** Пресет условий хранения */
  @Prop({
    type: String,
    enum: Object.values(StoragePreset),
    default: StoragePreset.GENERIC,
  })
  preset: StoragePreset;

  /** Пользовательский срок годности (дней), если отличается от справочника */
  @Prop({ type: Number, min: 1 })
  customShelfLifeDays?: number;

  /** Включена ли усушка (для овощей/фруктов) */
  @Prop({ type: Boolean, default: false })
  shrinkageEnabled: boolean;

  /** Процент усушки в день */
  @Prop({ type: Number, min: 0, max: 10, default: 0 })
  shrinkagePercentPerDay: number;
}
export const StorageSettingsSchema =
  SchemaFactory.createForClass(StorageSettings);

/**
 * Настройки ценообразования
 */
@Schema({ _id: false })
export class PricingSettings {
  /** Базовая розничная цена (онлайн) */
  @Prop({ type: Number, min: 0 })
  baseOnlinePrice?: number;

  /** Базовая розничная цена (офлайн) */
  @Prop({ type: Number, min: 0 })
  baseOfflinePrice?: number;

  /** Минимальная наценка (%) */
  @Prop({ type: Number, min: 0, default: 20 })
  minMarkupPercent: number;

  /** Стратегия расчёта закупочной цены */
  @Prop({
    type: String,
    enum: Object.values(PurchasePriceStrategy),
    default: PurchasePriceStrategy.WEIGHTED_AVERAGE,
  })
  purchasePriceStrategy: PurchasePriceStrategy;

  /** Автоматически применять скидки по сроку годности */
  @Prop({ type: Boolean, default: true })
  autoExpirationDiscounts: boolean;
}
export const PricingSettingsSchema =
  SchemaFactory.createForClass(PricingSettings);

/**
 * Допустимая погрешность веса (для ProductTemplate)
 */
@Schema({ _id: false })
export class WeightToleranceSettings {
  /** Допустимое отклонение веса (0.05 = 5%) */
  @Prop({ type: Number, min: 0.05, max: 0.15, default: 0.1 })
  weightTolerance: number;
}
export const WeightToleranceSettingsSchema =
  SchemaFactory.createForClass(WeightToleranceSettings);

/**
 * ProductTemplate — шаблон товара продавца
 *
 * Связывает товар из справочника (Product) с настройками продавца:
 * - Условия хранения
 * - Ценообразование
 * - Усушка
 * - Допуски по весу
 */
@Schema({
  timestamps: true,
  collection: 'inventory_product_templates',
})
export class ProductTemplate {
  _id: Types.ObjectId;

  /** Продавец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Товар из справочника (Product) */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  /** Название (денормализовано для поиска) */
  @Prop({ type: String, required: true })
  productName: string;

  /** Категория товара (денормализовано) */
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;

  /** Единица измерения */
  @Prop({
    type: String,
    enum: Object.values(ProductUnit),
    required: true,
    default: ProductUnit.KG,
  })
  unit: ProductUnit;

  /** Статус */
  @Prop({
    type: String,
    enum: Object.values(ProductTemplateStatus),
    default: ProductTemplateStatus.ACTIVE,
    index: true,
  })
  status: ProductTemplateStatus;

  /** Настройки хранения */
  @Prop({ type: StorageSettingsSchema, default: () => ({}) })
  storageSettings: StorageSettings;

  /** Настройки ценообразования */
  @Prop({ type: PricingSettingsSchema, default: () => ({}) })
  pricingSettings: PricingSettings;

  /** Настройки допусков */
  @Prop({ type: WeightToleranceSettingsSchema, default: () => ({}) })
  toleranceSettings: WeightToleranceSettings;

  /** Штрихкоды (EAN-13, EAN-8 и т.д.) */
  @Prop({ type: [String], default: () => [] })
  barcodes: string[];

  /** Артикул продавца */
  @Prop({ type: String })
  sku?: string;

  /** Поставщики по умолчанию */
  @Prop({ type: [String], default: () => [] })
  defaultSuppliers: string[];

  /** Заметки продавца */
  @Prop({ type: String })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type ProductTemplateDocument = HydratedDocument<ProductTemplate>;
export type ProductTemplateModel = Model<ProductTemplate>;

export const ProductTemplateSchema =
  SchemaFactory.createForClass(ProductTemplate);

// Индексы
ProductTemplateSchema.index({ seller: 1, product: 1 }, { unique: true });
ProductTemplateSchema.index({ seller: 1, status: 1 });
ProductTemplateSchema.index({ seller: 1, category: 1 });
ProductTemplateSchema.index({ barcodes: 1 });
ProductTemplateSchema.index({ sku: 1 });
ProductTemplateSchema.index(
  { productName: 'text' },
  { weights: { productName: 10 } },
);
