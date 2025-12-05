import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  StoragePreset,
  StorageSensitivity,
} from '../storage-preset/storage-preset.enums';

/**
 * Условия хранения товара
 * Встраиваемая схема для ProductTemplate
 */
@Schema({ _id: false })
export class StorageConditions {
  /** Пресет коэффициентов деградации */
  @Prop({
    type: String,
    enum: Object.values(StoragePreset),
    default: StoragePreset.GENERIC,
  })
  preset: StoragePreset;

  /** Базовый срок годности в днях (при идеальных условиях) */
  @Prop({ type: Number, required: true, min: 1 })
  baseShelfLifeDays: number;

  /** Идеальная температура (мин) в °C */
  @Prop({ type: Number })
  idealTempMin?: number;

  /** Идеальная температура (макс) в °C */
  @Prop({ type: Number })
  idealTempMax?: number;

  /** Идеальная влажность (мин) в % */
  @Prop({ type: Number, min: 0, max: 100 })
  idealHumidityMin?: number;

  /** Идеальная влажность (макс) в % */
  @Prop({ type: Number, min: 0, max: 100 })
  idealHumidityMax?: number;

  /** Чувствительность к условиям хранения */
  @Prop({
    type: String,
    enum: Object.values(StorageSensitivity),
    default: StorageSensitivity.MEDIUM,
  })
  sensitivity: StorageSensitivity;

  /** Критическая температура (мин) — ниже этого товар портится мгновенно */
  @Prop({ type: Number })
  criticalTempMin?: number;

  /** Критическая температура (макс) — выше этого товар портится мгновенно */
  @Prop({ type: Number })
  criticalTempMax?: number;

  /** Требует заморозки */
  @Prop({ type: Boolean, default: false })
  requiresFreezing?: boolean;

  /** Боится холода (тропические фрукты) */
  @Prop({ type: Boolean, default: false })
  coldSensitive?: boolean;
}

export const StorageConditionsSchema =
  SchemaFactory.createForClass(StorageConditions);

/**
 * Актуальные условия в локации (для мониторинга)
 */
@Schema({ _id: false })
export class CurrentConditions {
  /** Текущая температура в °C */
  @Prop({ type: Number })
  temperature?: number;

  /** Текущая влажность в % */
  @Prop({ type: Number, min: 0, max: 100 })
  humidity?: number;

  /** Время последнего обновления */
  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  /** Источник данных */
  @Prop({ type: String, enum: ['MANUAL', 'SENSOR'], default: 'MANUAL' })
  source: 'MANUAL' | 'SENSOR';

  /** ID датчика (если source=SENSOR) */
  @Prop({ type: String })
  sensorId?: string;
}

export const CurrentConditionsSchema =
  SchemaFactory.createForClass(CurrentConditions);

/**
 * История условий (для аналитики)
 */
@Schema({ _id: false })
export class ConditionsHistoryEntry {
  @Prop({ type: Number })
  temperature?: number;

  @Prop({ type: Number })
  humidity?: number;

  @Prop({ type: Date, required: true })
  recordedAt: Date;

  @Prop({ type: String, enum: ['MANUAL', 'SENSOR'], default: 'MANUAL' })
  source: 'MANUAL' | 'SENSOR';
}

export const ConditionsHistoryEntrySchema = SchemaFactory.createForClass(
  ConditionsHistoryEntry,
);

/**
 * Целевые условия для локации
 */
@Schema({ _id: false })
export class TargetConditions {
  /** Целевая температура (мин) */
  @Prop({ type: Number })
  tempMin?: number;

  /** Целевая температура (макс) */
  @Prop({ type: Number })
  tempMax?: number;

  /** Целевая влажность (мин) */
  @Prop({ type: Number, min: 0, max: 100 })
  humidityMin?: number;

  /** Целевая влажность (макс) */
  @Prop({ type: Number, min: 0, max: 100 })
  humidityMax?: number;

  /** Допустимое отклонение температуры в °C */
  @Prop({ type: Number, default: 2 })
  tempTolerance?: number;

  /** Допустимое отклонение влажности в % */
  @Prop({ type: Number, default: 10 })
  humidityTolerance?: number;
}

export const TargetConditionsSchema =
  SchemaFactory.createForClass(TargetConditions);
