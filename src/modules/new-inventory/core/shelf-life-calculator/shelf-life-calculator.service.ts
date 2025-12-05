import { Injectable } from '@nestjs/common';
import {
  StoragePreset,
  TemperatureRange,
  HumidityRange,
  getPresetConfig,
} from '../storage-preset';
import {
  LocationInfo,
  ProductInfo,
  DegradationResult,
  FreshnessResult,
  RecalculateOnMoveInput,
  RecalculateOnMoveResult,
} from './shelf-life-calculator.types';

/**
 * Сервис расчёта динамических сроков годности
 *
 * Основные принципы:
 * 1. freshnessRemaining: 0-10 (10 = свежий, 0 = испорчен)
 * 2. coefficient: множитель скорости потери свежести
 *    - < 1.0 = товар портится медленнее (хорошие условия)
 *    - = 1.0 = нормальная скорость
 *    - > 1.0 = товар портится быстрее (плохие условия)
 * 3. При перемещении пересчитывается effectiveExpirationDate
 */
@Injectable()
export class ShelfLifeCalculatorService {
  /** Максимальная свежесть (полностью свежий товар) */
  private readonly MAX_FRESHNESS = 10;
  /** Минимальная свежесть (испорчен) */
  private readonly MIN_FRESHNESS = 0;
  /** Часов в сутках */
  private readonly HOURS_PER_DAY = 24;

  /**
   * Определить температурный диапазон по числовому значению
   */
  getTemperatureRange(temperature: number): TemperatureRange {
    if (temperature <= -10) return TemperatureRange.FREEZER;
    if (temperature <= 4) return TemperatureRange.COLD;
    if (temperature <= 15) return TemperatureRange.COOL;
    if (temperature <= 25) return TemperatureRange.ROOM;
    return TemperatureRange.WARM;
  }

  /**
   * Определить диапазон влажности по числовому значению
   */
  getHumidityRange(humidity: number): HumidityRange {
    if (humidity < 50) return HumidityRange.DRY;
    if (humidity < 70) return HumidityRange.NORMAL;
    if (humidity < 90) return HumidityRange.HUMID;
    return HumidityRange.VERY_HUMID;
  }

  /**
   * Рассчитать коэффициент деградации для условий хранения
   *
   * @param preset - Пресет товара
   * @param temperature - Температура в °C
   * @param humidity - Влажность в %
   * @returns Результат с коэффициентом и деталями
   */
  calculateDegradationCoefficient(
    preset: StoragePreset,
    temperature?: number,
    humidity?: number,
  ): DegradationResult {
    const config = getPresetConfig(preset);

    // Определяем диапазоны (или используем нормальные по умолчанию)
    const tempRange =
      temperature !== undefined
        ? this.getTemperatureRange(temperature)
        : TemperatureRange.ROOM;

    const humidRange =
      humidity !== undefined
        ? this.getHumidityRange(humidity)
        : HumidityRange.NORMAL;

    // Проверяем критические комбинации
    if (config.criticalCombinations) {
      const critical = config.criticalCombinations.find(
        (c) => c.temperature === tempRange && c.humidity === humidRange,
      );
      if (critical) {
        return {
          coefficient: critical.coefficient,
          temperatureRange: tempRange,
          humidityRange: humidRange,
          temperatureCoefficient: config.temperature[tempRange],
          humidityCoefficient: config.humidity[humidRange],
          isCriticalCombination: true,
        };
      }
    }

    // Обычный расчёт: температура × влажность
    const tempCoeff = config.temperature[tempRange];
    const humidCoeff = config.humidity[humidRange];
    const coefficient = tempCoeff * humidCoeff;

    return {
      coefficient,
      temperatureRange: tempRange,
      humidityRange: humidRange,
      temperatureCoefficient: tempCoeff,
      humidityCoefficient: humidCoeff,
      isCriticalCombination: false,
    };
  }

  /**
   * Рассчитать потраченную свежесть за время в локации
   *
   * @param product - Информация о товаре
   * @param hoursInLocation - Время в локации (часы)
   * @param coefficient - Коэффициент деградации
   * @returns Потраченная свежесть (0-10)
   */
  calculateFreshnessConsumed(
    product: ProductInfo,
    hoursInLocation: number,
    coefficient: number,
  ): number {
    // Базовая скорость потери свежести в час
    // За baseShelfLifeDays дней теряется вся свежесть (10)
    const baseFreshnessPerHour =
      this.MAX_FRESHNESS / (product.baseShelfLifeDays * this.HOURS_PER_DAY);

    // С учётом коэффициента
    const actualFreshnessPerHour = baseFreshnessPerHour * coefficient;

    return actualFreshnessPerHour * hoursInLocation;
  }

  /**
   * Рассчитать новый срок годности на основе оставшейся свежести
   *
   * @param freshnessRemaining - Оставшаяся свежесть (0-10)
   * @param product - Информация о товаре
   * @param coefficient - Коэффициент деградации в новой локации
   * @param fromDate - Дата отсчёта
   * @returns Новая дата истечения срока
   */
  calculateNewExpirationDate(
    freshnessRemaining: number,
    product: ProductInfo,
    coefficient: number,
    fromDate: Date,
  ): Date {
    // Сколько часов осталось жить товару
    const baseFreshnessPerHour =
      this.MAX_FRESHNESS / (product.baseShelfLifeDays * this.HOURS_PER_DAY);
    const actualFreshnessPerHour = baseFreshnessPerHour * coefficient;

    const hoursRemaining = freshnessRemaining / actualFreshnessPerHour;

    // Новая дата
    const newDate = new Date(fromDate);
    newDate.setTime(newDate.getTime() + hoursRemaining * 60 * 60 * 1000);

    return newDate;
  }

  /**
   * Рассчитать свежесть после нахождения в локации
   *
   * @param currentFreshness - Текущая свежесть (0-10)
   * @param product - Информация о товаре
   * @param location - Информация о локации
   * @param hoursInLocation - Время в локации (часы)
   * @returns Результат с новой свежестью и сроком
   */
  calculateFreshnessAfterStorage(
    currentFreshness: number,
    product: ProductInfo,
    location: LocationInfo,
    hoursInLocation: number,
  ): FreshnessResult {
    const degradation = this.calculateDegradationCoefficient(
      product.preset,
      location.temperature,
      location.humidity,
    );

    const consumed = this.calculateFreshnessConsumed(
      product,
      hoursInLocation,
      degradation.coefficient,
    );

    const remaining = Math.max(
      this.MIN_FRESHNESS,
      currentFreshness - consumed,
    );

    const warnings: string[] = [];

    // Добавляем предупреждения
    if (degradation.isCriticalCombination) {
      warnings.push(
        `Критическая комбинация условий! Коэффициент: ${degradation.coefficient}`,
      );
    }
    if (degradation.coefficient > 2) {
      warnings.push(
        `Высокий коэффициент деградации: ${degradation.coefficient.toFixed(2)}`,
      );
    }
    if (remaining < 3) {
      warnings.push(`Низкая свежесть: ${remaining.toFixed(1)}/10`);
    }

    const newExpirationDate = this.calculateNewExpirationDate(
      remaining,
      product,
      degradation.coefficient,
      new Date(),
    );

    return {
      consumed,
      remaining,
      newExpirationDate,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Пересчитать срок партии при перемещении между локациями
   *
   * Алгоритм:
   * 1. Рассчитать время в старой локации
   * 2. Рассчитать потраченную свежесть в старой локации
   * 3. Вычислить оставшуюся свежесть
   * 4. Рассчитать новый срок с коэффициентом новой локации
   */
  recalculateBatchShelfLife(
    input: RecalculateOnMoveInput,
  ): RecalculateOnMoveResult {
    const { product, batch, oldLocation, newLocation, moveDate } = input;

    // 1. Время в старой локации (часы)
    const hoursInOldLocation =
      (moveDate.getTime() - batch.arrivedAt.getTime()) / (1000 * 60 * 60);

    // 2. Коэффициент в старой локации
    const oldDegradation = this.calculateDegradationCoefficient(
      product.preset,
      oldLocation.temperature,
      oldLocation.humidity,
    );

    // 3. Потраченная свежесть
    const freshnessConsumed = this.calculateFreshnessConsumed(
      product,
      hoursInOldLocation,
      oldDegradation.coefficient,
    );

    // 4. Оставшаяся свежесть
    const newFreshnessRemaining = Math.max(
      this.MIN_FRESHNESS,
      batch.freshnessRemaining - freshnessConsumed,
    );

    // 5. Коэффициент в новой локации
    const newDegradation = this.calculateDegradationCoefficient(
      product.preset,
      newLocation.temperature,
      newLocation.humidity,
    );

    // 6. Новый срок годности
    const newExpirationDate = this.calculateNewExpirationDate(
      newFreshnessRemaining,
      product,
      newDegradation.coefficient,
      moveDate,
    );

    return {
      newFreshnessRemaining,
      newExpirationDate,
      oldLocationCoefficient: oldDegradation.coefficient,
      newLocationCoefficient: newDegradation.coefficient,
      hoursInOldLocation,
      freshnessConsumedInOldLocation: freshnessConsumed,
    };
  }

  /**
   * Рассчитать начальную свежесть партии при приёмке
   *
   * @param product - Информация о товаре
   * @param originalExpirationDate - Срок от поставщика
   * @param receivedAt - Дата приёмки
   * @returns Начальная свежесть (0-10)
   */
  calculateInitialFreshness(
    product: ProductInfo,
    originalExpirationDate: Date,
    receivedAt: Date,
  ): number {
    const totalShelfLifeMs =
      product.baseShelfLifeDays * this.HOURS_PER_DAY * 60 * 60 * 1000;
    const remainingMs = originalExpirationDate.getTime() - receivedAt.getTime();

    // Процент оставшегося срока → свежесть
    const freshnessRatio = Math.max(0, Math.min(1, remainingMs / totalShelfLifeMs));
    return freshnessRatio * this.MAX_FRESHNESS;
  }

  /**
   * Проверить, истёк ли срок годности
   */
  isExpired(
    freshnessRemaining: number,
    effectiveExpirationDate: Date,
  ): boolean {
    return (
      freshnessRemaining <= this.MIN_FRESHNESS ||
      effectiveExpirationDate.getTime() < Date.now()
    );
  }

  /**
   * Получить статус свежести
   */
  getFreshnessStatus(
    freshnessRemaining: number,
  ): 'FRESH' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'EXPIRED' {
    if (freshnessRemaining >= 8) return 'FRESH';
    if (freshnessRemaining >= 5) return 'GOOD';
    if (freshnessRemaining >= 3) return 'WARNING';
    if (freshnessRemaining > 0) return 'CRITICAL';
    return 'EXPIRED';
  }
}
