import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  ProductCategory,
  ProductUnit,
  InventoryProductStatus,
  ShelfLifeType,
  ProductOrigin,
} from './inventory-product.enums';
import { StoragePreset } from '../../core/storage-preset/storage-preset.enums';

/**
 * Условия хранения продукта
 */
@Schema({ _id: false })
export class StorageRequirements {
  /** Пресет условий хранения */
  @Prop({
    type: String,
    enum: Object.values(StoragePreset),
    default: StoragePreset.GENERIC,
  })
  preset: StoragePreset;

  /** Минимальная температура (°C) */
  @Prop({ type: Number })
  minTemperature?: number;

  /** Максимальная температура (°C) */
  @Prop({ type: Number })
  maxTemperature?: number;

  /** Оптимальная температура (°C) */
  @Prop({ type: Number })
  optimalTemperature?: number;

  /** Минимальная влажность (%) */
  @Prop({ type: Number, min: 0, max: 100 })
  minHumidity?: number;

  /** Максимальная влажность (%) */
  @Prop({ type: Number, min: 0, max: 100 })
  maxHumidity?: number;

  /** Требует охлаждения */
  @Prop({ type: Boolean, default: false })
  requiresRefrigeration: boolean;

  /** Требует заморозки */
  @Prop({ type: Boolean, default: false })
  requiresFreezing: boolean;

  /** Чувствителен к свету */
  @Prop({ type: Boolean, default: false })
  lightSensitive: boolean;

  /** Чувствителен к этилену */
  @Prop({ type: Boolean, default: false })
  ethyleneSensitive: boolean;

  /** Выделяет этилен */
  @Prop({ type: Boolean, default: false })
  producesEthylene: boolean;
}
export const StorageRequirementsSchema =
  SchemaFactory.createForClass(StorageRequirements);

/**
 * Настройки срока годности
 */
@Schema({ _id: false })
export class ShelfLifeSettings {
  /** Тип срока годности */
  @Prop({
    type: String,
    enum: Object.values(ShelfLifeType),
    default: ShelfLifeType.PERISHABLE,
  })
  type: ShelfLifeType;

  /** Базовый срок годности (дни) при идеальных условиях */
  @Prop({ type: Number, min: 1, required: true })
  baseDays: number;

  /** Минимальный срок для приёмки (дни) */
  @Prop({ type: Number, min: 0, default: 1 })
  minDaysForReceiving: number;

  /** Коэффициент деградации вне оптимальных условий */
  @Prop({ type: Number, min: 0, max: 10, default: 1 })
  degradationCoefficient: number;
}
export const ShelfLifeSettingsSchema =
  SchemaFactory.createForClass(ShelfLifeSettings);

/**
 * Настройки усушки (shrinkage)
 */
@Schema({ _id: false })
export class ShrinkageSettings {
  /** Включена ли усушка */
  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  /** Процент усушки в день (%) */
  @Prop({ type: Number, min: 0, max: 10, default: 0 })
  percentPerDay: number;

  /** Максимальная усушка (%) */
  @Prop({ type: Number, min: 0, max: 50, default: 10 })
  maxPercent: number;
}
export const ShrinkageSettingsSchema =
  SchemaFactory.createForClass(ShrinkageSettings);

/**
 * Настройки допуска веса (tolerance)
 */
@Schema({ _id: false })
export class ToleranceSettings {
  /** Включён ли допуск */
  @Prop({ type: Boolean, default: true })
  enabled: boolean;

  /** Процент допуска (±%) — от 5% до 15% */
  @Prop({ type: Number, min: 0.05, max: 0.15, default: 0.1 })
  percent: number;
}
export const ToleranceSettingsSchema =
  SchemaFactory.createForClass(ToleranceSettings);

/**
 * InventoryProduct — продукт в системе складского учёта
 *
 * Независимая сущность, содержащая всю информацию о продукте,
 * необходимую для складского учёта:
 * - Условия хранения
 * - Сроки годности
 * - Усушка
 * - Допуски веса
 * - Категоризация
 */
@Schema({
  timestamps: true,
  collection: 'inventory_products',
})
export class InventoryProduct {
  _id: Types.ObjectId;

  /** Продавец (владелец каталога) */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Название продукта */
  @Prop({ type: String, required: true })
  name: string;

  /** Описание */
  @Prop({ type: String })
  description?: string;

  /** SKU (артикул) */
  @Prop({ type: String, index: true })
  sku?: string;

  /** Штрих-коды */
  @Prop({ type: [String], default: [] })
  barcodes: string[];

  /** Категория */
  @Prop({
    type: String,
    enum: Object.values(ProductCategory),
    required: true,
    index: true,
  })
  category: ProductCategory;

  /** Подкатегория (свободный текст) */
  @Prop({ type: String })
  subcategory?: string;

  /** Единица измерения */
  @Prop({
    type: String,
    enum: Object.values(ProductUnit),
    required: true,
  })
  unit: ProductUnit;

  /** Вес единицы товара (кг) — для штучных товаров */
  @Prop({ type: Number, min: 0 })
  unitWeight?: number;

  /** Статус */
  @Prop({
    type: String,
    enum: Object.values(InventoryProductStatus),
    default: InventoryProductStatus.ACTIVE,
    index: true,
  })
  status: InventoryProductStatus;

  /** Происхождение */
  @Prop({
    type: String,
    enum: Object.values(ProductOrigin),
    default: ProductOrigin.LOCAL,
  })
  origin: ProductOrigin;

  /** Страна происхождения */
  @Prop({ type: String })
  countryOfOrigin?: string;

  /** Условия хранения */
  @Prop({ type: StorageRequirementsSchema, default: () => ({}) })
  storageRequirements: StorageRequirements;

  /** Настройки срока годности */
  @Prop({
    type: ShelfLifeSettingsSchema,
    required: true,
    default: () => ({ baseDays: 7, type: ShelfLifeType.PERISHABLE }),
  })
  shelfLife: ShelfLifeSettings;

  /** Настройки усушки */
  @Prop({ type: ShrinkageSettingsSchema, default: () => ({}) })
  shrinkage: ShrinkageSettings;

  /** Настройки допуска веса */
  @Prop({ type: ToleranceSettingsSchema, default: () => ({}) })
  tolerance: ToleranceSettings;

  /** URL изображения */
  @Prop({ type: String })
  imageUrl?: string;

  /** Галерея изображений */
  @Prop({ type: [String], default: [] })
  gallery: string[];

  /** Связь с мастер-продуктом платформы (опционально) */
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  masterProduct?: Types.ObjectId;

  /** Теги для поиска */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /** Дополнительные атрибуты */
  @Prop({ type: Object })
  attributes?: Record<string, any>;

  /** Активен ли продукт */
  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type InventoryProductDocument = HydratedDocument<InventoryProduct>;
export type InventoryProductModel = Model<InventoryProduct>;

export const InventoryProductSchema =
  SchemaFactory.createForClass(InventoryProduct);

// Индексы
InventoryProductSchema.index({ seller: 1, status: 1 });
InventoryProductSchema.index({ seller: 1, category: 1 });
InventoryProductSchema.index({ seller: 1, sku: 1 }, { unique: true, sparse: true });
InventoryProductSchema.index({ barcodes: 1 });
InventoryProductSchema.index({ name: 'text', tags: 'text' });
InventoryProductSchema.index({ masterProduct: 1 }, { sparse: true });
