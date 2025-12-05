import { StoragePreset, TemperatureRange, HumidityRange } from '../storage-preset';

/**
 * Информация о локации для расчёта
 */
export interface LocationInfo {
  /** Текущая температура в °C */
  temperature?: number;
  /** Текущая влажность в % */
  humidity?: number;
  /** Пресет по умолчанию (если нет данных о товаре) */
  defaultPreset?: StoragePreset;
}

/**
 * Информация о товаре для расчёта
 */
export interface ProductInfo {
  /** Пресет коэффициентов */
  preset: StoragePreset;
  /** Базовый срок годности в днях */
  baseShelfLifeDays: number;
  /** Идеальная температура */
  idealTempMin?: number;
  idealTempMax?: number;
  /** Идеальная влажность */
  idealHumidityMin?: number;
  idealHumidityMax?: number;
}

/**
 * Информация о партии для расчёта
 */
export interface BatchInfo {
  /** Исходный срок годности от поставщика */
  originalExpirationDate: Date;
  /** Текущий динамический срок */
  effectiveExpirationDate: Date;
  /** Оставшаяся свежесть (0-10) */
  freshnessRemaining: number;
  /** Дата поступления в систему */
  receivedAt: Date;
  /** Дата прибытия в текущую локацию */
  arrivedAt: Date;
}

/**
 * Результат расчёта деградации
 */
export interface DegradationResult {
  /** Итоговый коэффициент деградации */
  coefficient: number;
  /** Диапазон температуры */
  temperatureRange: TemperatureRange;
  /** Диапазон влажности */
  humidityRange: HumidityRange;
  /** Температурный коэффициент */
  temperatureCoefficient: number;
  /** Влажностный коэффициент */
  humidityCoefficient: number;
  /** Использована критическая комбинация? */
  isCriticalCombination: boolean;
}

/**
 * Результат расчёта свежести
 */
export interface FreshnessResult {
  /** Потраченная свежесть */
  consumed: number;
  /** Оставшаяся свежесть */
  remaining: number;
  /** Новый динамический срок годности */
  newExpirationDate: Date;
  /** Предупреждения */
  warnings?: string[];
}

/**
 * Входные данные для пересчёта при перемещении
 */
export interface RecalculateOnMoveInput {
  /** Информация о товаре */
  product: ProductInfo;
  /** Информация о партии */
  batch: BatchInfo;
  /** Старая локация */
  oldLocation: LocationInfo;
  /** Новая локация */
  newLocation: LocationInfo;
  /** Дата перемещения */
  moveDate: Date;
}

/**
 * Результат пересчёта при перемещении
 */
export interface RecalculateOnMoveResult {
  /** Новая оставшаяся свежесть */
  newFreshnessRemaining: number;
  /** Новый динамический срок годности */
  newExpirationDate: Date;
  /** Коэффициент в старой локации */
  oldLocationCoefficient: number;
  /** Коэффициент в новой локации */
  newLocationCoefficient: number;
  /** Время в старой локации (часы) */
  hoursInOldLocation: number;
  /** Потраченная свежесть в старой локации */
  freshnessConsumedInOldLocation: number;
}
