import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  StorageLocationType,
  StorageLocationStatus,
  StorageEquipmentType,
} from './storage-location.enums';
import { TemperatureRange, HumidityRange } from '../../core/storage-preset';

/**
 * Фактические условия хранения
 */
@Schema({ _id: false })
export class ActualConditions {
  /** Диапазон температуры */
  @Prop({
    type: String,
    enum: Object.values(TemperatureRange),
    default: TemperatureRange.ROOM,
  })
  temperature: TemperatureRange;

  /** Диапазон влажности */
  @Prop({
    type: String,
    enum: Object.values(HumidityRange),
    default: HumidityRange.NORMAL,
  })
  humidity: HumidityRange;

  /** Последнее обновление условий */
  @Prop({ type: Date })
  lastUpdatedAt?: Date;

  /** Источник данных (manual, sensor, estimated) */
  @Prop({ type: String, default: 'manual' })
  source: string;
}
export const ActualConditionsSchema =
  SchemaFactory.createForClass(ActualConditions);

/**
 * Зона хранения внутри локации
 */
@Schema({ _id: true })
export class StorageZone {
  _id: Types.ObjectId;

  /** Название зоны */
  @Prop({ type: String, required: true })
  name: string;

  /** Тип оборудования */
  @Prop({
    type: String,
    enum: Object.values(StorageEquipmentType),
    default: StorageEquipmentType.NONE,
  })
  equipmentType: StorageEquipmentType;

  /** Условия в зоне */
  @Prop({ type: ActualConditionsSchema, default: () => ({}) })
  conditions: ActualConditions;

  /** Вместимость (условные единицы) */
  @Prop({ type: Number, min: 0 })
  capacity?: number;

  /** Используемая вместимость */
  @Prop({ type: Number, min: 0, default: 0 })
  usedCapacity: number;
}
export const StorageZoneSchema = SchemaFactory.createForClass(StorageZone);

/**
 * StorageLocation — локация хранения
 *
 * Описывает физическое место хранения товаров:
 * - Магазин или склад
 * - Зоны с разными условиями хранения
 * - Фактические условия (температура, влажность)
 */
@Schema({
  timestamps: true,
  collection: 'inventory_storage_locations',
})
export class StorageLocation {
  _id: Types.ObjectId;

  /** Продавец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Тип локации */
  @Prop({
    type: String,
    enum: Object.values(StorageLocationType),
    required: true,
    index: true,
  })
  locationType: StorageLocationType;

  /** Магазин (если type = SHOP) */
  @Prop({ type: Types.ObjectId, ref: 'Shop', index: true })
  shop?: Types.ObjectId;

  /** Склад (если type = WAREHOUSE) */
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', index: true })
  warehouse?: Types.ObjectId;

  /** Название локации */
  @Prop({ type: String, required: true })
  name: string;

  /** Адрес */
  @Prop({ type: String })
  address?: string;

  /** Статус */
  @Prop({
    type: String,
    enum: Object.values(StorageLocationStatus),
    default: StorageLocationStatus.ACTIVE,
    index: true,
  })
  status: StorageLocationStatus;

  /** Основные условия хранения локации */
  @Prop({ type: ActualConditionsSchema, default: () => ({}) })
  defaultConditions: ActualConditions;

  /** Зоны хранения */
  @Prop({ type: [StorageZoneSchema], default: () => [] })
  zones: StorageZone[];

  /**
   * Коэффициент деградации локации (рассчитывается автоматически)
   * 1.0 = идеальные условия
   * > 1.0 = товар портится быстрее
   */
  @Prop({ type: Number, min: 0.5, max: 3.0, default: 1.0 })
  degradationCoefficient: number;

  /** Заметки */
  @Prop({ type: String })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type StorageLocationDocument = HydratedDocument<StorageLocation>;
export type StorageLocationModel = Model<StorageLocation>;

export const StorageLocationSchema =
  SchemaFactory.createForClass(StorageLocation);

// Индексы
StorageLocationSchema.index({ seller: 1, locationType: 1 });
StorageLocationSchema.index({ shop: 1 }, { sparse: true });
StorageLocationSchema.index({ warehouse: 1 }, { sparse: true });

// Виртуал: locationId
StorageLocationSchema.virtual('locationId').get(function () {
  return this.locationType === StorageLocationType.SHOP
    ? this.shop?.toHexString()
    : this.warehouse?.toHexString();
});
