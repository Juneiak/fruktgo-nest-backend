import {
  StoragePreset,
  TemperatureRange,
  HumidityRange,
} from './storage-preset.enums';

/**
 * Критическая комбинация условий — переопределяет расчёт коэффициента
 */
export interface CriticalCombination {
  temperature: TemperatureRange;
  humidity: HumidityRange;
  /** Коэффициент деградации для этой комбинации */
  coefficient: number;
}

/**
 * Конфигурация коэффициентов для пресета
 */
export interface PresetCoefficients {
  /** Коэффициенты по температуре */
  temperature: Record<TemperatureRange, number>;
  /** Коэффициенты по влажности */
  humidity: Record<HumidityRange, number>;
  /** Критические комбинации (переопределяют расчёт) */
  criticalCombinations?: CriticalCombination[];
  /** Базовый срок годности в днях (справочно) */
  baseShelfLifeDays?: number;
  /** Идеальная температура (мин-макс) */
  idealTemp?: { min: number; max: number };
  /** Идеальная влажность (мин-макс) */
  idealHumidity?: { min: number; max: number };
}

/**
 * Базовые коэффициенты температуры (для GENERIC)
 */
const BASE_TEMPERATURE_COEFFICIENTS: Record<TemperatureRange, number> = {
  [TemperatureRange.FREEZER]: 0.05,
  [TemperatureRange.COLD]: 0.5,
  [TemperatureRange.COOL]: 0.8,
  [TemperatureRange.ROOM]: 1.0,
  [TemperatureRange.WARM]: 2.0,
};

/**
 * Базовые коэффициенты влажности (для GENERIC)
 */
const BASE_HUMIDITY_COEFFICIENTS: Record<HumidityRange, number> = {
  [HumidityRange.DRY]: 1.2,
  [HumidityRange.NORMAL]: 1.0,
  [HumidityRange.HUMID]: 1.1,
  [HumidityRange.VERY_HUMID]: 1.3,
};

/**
 * Конфигурация всех пресетов коэффициентов
 *
 * Коэффициент = температурный × влажностный
 * - < 1.0 = товар портится медленнее (хорошие условия)
 * - = 1.0 = нормальная скорость (эталон)
 * - > 1.0 = товар портится быстрее (плохие условия)
 */
export const STORAGE_PRESET_CONFIG: Record<StoragePreset, PresetCoefficients> =
  {
    // ═══════════════════════════════════════════════════════════════
    // ЯГОДЫ — очень чувствительны к температуре и влажности
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.BERRIES]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.02,
        [TemperatureRange.COLD]: 0.4,
        [TemperatureRange.COOL]: 0.8,
        [TemperatureRange.ROOM]: 1.5,
        [TemperatureRange.WARM]: 3.0,
      },
      humidity: {
        [HumidityRange.DRY]: 1.8,
        [HumidityRange.NORMAL]: 1.3,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 0.9,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.WARM,
          humidity: HumidityRange.VERY_HUMID,
          coefficient: 8.0,
        },
        {
          temperature: TemperatureRange.ROOM,
          humidity: HumidityRange.DRY,
          coefficient: 4.0,
        },
      ],
      baseShelfLifeDays: 5,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 90, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // КОСТОЧКОВЫЕ — персики, сливы, вишня
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.STONE_FRUITS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.03,
        [TemperatureRange.COLD]: 0.5,
        [TemperatureRange.COOL]: 0.7,
        [TemperatureRange.ROOM]: 1.2,
        [TemperatureRange.WARM]: 2.5,
      },
      humidity: {
        [HumidityRange.DRY]: 1.5,
        [HumidityRange.NORMAL]: 1.1,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 1.2,
      },
      baseShelfLifeDays: 7,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 85, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ЦИТРУСОВЫЕ — относительно устойчивы
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.CITRUS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.1, // цитрусы не любят заморозку
        [TemperatureRange.COLD]: 0.6,
        [TemperatureRange.COOL]: 0.5, // оптимально
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.8,
      },
      humidity: {
        [HumidityRange.DRY]: 1.4,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 0.9,
        [HumidityRange.VERY_HUMID]: 1.3,
      },
      baseShelfLifeDays: 21,
      idealTemp: { min: 10, max: 15 },
      idealHumidity: { min: 85, max: 90 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ЯБЛОКИ И ГРУШИ — долгое хранение
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.APPLES_PEARS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.05,
        [TemperatureRange.COLD]: 0.3,
        [TemperatureRange.COOL]: 0.5,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.5,
      },
      humidity: {
        [HumidityRange.DRY]: 1.3,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 0.9,
        [HumidityRange.VERY_HUMID]: 1.2,
      },
      baseShelfLifeDays: 30,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 90, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ТРОПИЧЕСКИЕ — бананы, манго, чувствительны к холоду!
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.TROPICAL]: {
      temperature: {
        [TemperatureRange.FREEZER]: 5.0, // критично!
        [TemperatureRange.COLD]: 2.0, // холодовое повреждение
        [TemperatureRange.COOL]: 0.8,
        [TemperatureRange.ROOM]: 1.0, // оптимально для бананов
        [TemperatureRange.WARM]: 1.5,
      },
      humidity: {
        [HumidityRange.DRY]: 1.5,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 0.9,
        [HumidityRange.VERY_HUMID]: 1.3,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.FREEZER,
          humidity: HumidityRange.DRY,
          coefficient: 10.0,
        },
      ],
      baseShelfLifeDays: 7,
      idealTemp: { min: 12, max: 18 },
      idealHumidity: { min: 85, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ЛИСТОВАЯ ЗЕЛЕНЬ — очень чувствительна
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.LEAFY_GREENS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.05,
        [TemperatureRange.COLD]: 0.5,
        [TemperatureRange.COOL]: 1.0,
        [TemperatureRange.ROOM]: 2.0,
        [TemperatureRange.WARM]: 4.0,
      },
      humidity: {
        [HumidityRange.DRY]: 3.0, // очень плохо!
        [HumidityRange.NORMAL]: 1.5,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 0.9,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.WARM,
          humidity: HumidityRange.DRY,
          coefficient: 12.0,
        },
      ],
      baseShelfLifeDays: 5,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 95, max: 100 },
    },

    // ═══════════════════════════════════════════════════════════════
    // КОРНЕПЛОДЫ — долгое хранение
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.ROOT_VEGETABLES]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.1,
        [TemperatureRange.COLD]: 0.3,
        [TemperatureRange.COOL]: 0.5,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.5,
      },
      humidity: {
        [HumidityRange.DRY]: 1.5,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 0.8,
        [HumidityRange.VERY_HUMID]: 1.2,
      },
      baseShelfLifeDays: 60,
      idealTemp: { min: 2, max: 8 },
      idealHumidity: { min: 85, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ТОМАТЫ — особый режим (не любят холод)
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.TOMATOES]: {
      temperature: {
        [TemperatureRange.FREEZER]: 5.0,
        [TemperatureRange.COLD]: 1.5, // теряют вкус
        [TemperatureRange.COOL]: 0.8,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.8,
      },
      humidity: {
        [HumidityRange.DRY]: 1.3,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 1.5,
      },
      baseShelfLifeDays: 7,
      idealTemp: { min: 12, max: 18 },
      idealHumidity: { min: 85, max: 90 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ОГУРЦЫ
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.CUCUMBERS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 5.0,
        [TemperatureRange.COLD]: 1.2,
        [TemperatureRange.COOL]: 0.7,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 2.0,
      },
      humidity: {
        [HumidityRange.DRY]: 2.0,
        [HumidityRange.NORMAL]: 1.2,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 0.9,
      },
      baseShelfLifeDays: 7,
      idealTemp: { min: 10, max: 15 },
      idealHumidity: { min: 90, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ГРИБЫ — высокая чувствительность
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.MUSHROOMS]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.05,
        [TemperatureRange.COLD]: 0.5,
        [TemperatureRange.COOL]: 1.0,
        [TemperatureRange.ROOM]: 2.0,
        [TemperatureRange.WARM]: 4.0,
      },
      humidity: {
        [HumidityRange.DRY]: 2.0,
        [HumidityRange.NORMAL]: 1.2,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 1.5,
      },
      baseShelfLifeDays: 5,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 85, max: 90 },
    },

    // ═══════════════════════════════════════════════════════════════
    // МОЛОЧНЫЕ ПРОДУКТЫ
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.DAIRY]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.1,
        [TemperatureRange.COLD]: 0.5,
        [TemperatureRange.COOL]: 1.5,
        [TemperatureRange.ROOM]: 4.0,
        [TemperatureRange.WARM]: 8.0,
      },
      humidity: {
        [HumidityRange.DRY]: 1.0,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.2,
        [HumidityRange.VERY_HUMID]: 1.5,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.ROOM,
          humidity: HumidityRange.HUMID,
          coefficient: 6.0,
        },
        {
          temperature: TemperatureRange.WARM,
          humidity: HumidityRange.HUMID,
          coefficient: 15.0,
        },
      ],
      baseShelfLifeDays: 14,
      idealTemp: { min: 2, max: 6 },
      idealHumidity: { min: 75, max: 85 },
    },

    // ═══════════════════════════════════════════════════════════════
    // МЯСО
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.MEAT]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.02,
        [TemperatureRange.COLD]: 0.5,
        [TemperatureRange.COOL]: 2.0,
        [TemperatureRange.ROOM]: 6.0,
        [TemperatureRange.WARM]: 12.0,
      },
      humidity: {
        [HumidityRange.DRY]: 1.3,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.2,
        [HumidityRange.VERY_HUMID]: 1.8,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.ROOM,
          humidity: HumidityRange.HUMID,
          coefficient: 10.0,
        },
      ],
      baseShelfLifeDays: 5,
      idealTemp: { min: 0, max: 4 },
      idealHumidity: { min: 75, max: 85 },
    },

    // ═══════════════════════════════════════════════════════════════
    // РЫБА / МОРЕПРОДУКТЫ
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.SEAFOOD]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.01,
        [TemperatureRange.COLD]: 0.6,
        [TemperatureRange.COOL]: 3.0,
        [TemperatureRange.ROOM]: 8.0,
        [TemperatureRange.WARM]: 15.0,
      },
      humidity: {
        [HumidityRange.DRY]: 1.5,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.3,
        [HumidityRange.VERY_HUMID]: 2.0,
      },
      criticalCombinations: [
        {
          temperature: TemperatureRange.ROOM,
          humidity: HumidityRange.HUMID,
          coefficient: 12.0,
        },
      ],
      baseShelfLifeDays: 3,
      idealTemp: { min: -2, max: 2 },
      idealHumidity: { min: 75, max: 85 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ВЫПЕЧКА
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.BAKERY]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.1,
        [TemperatureRange.COLD]: 0.8, // черствеет быстрее в холоде
        [TemperatureRange.COOL]: 0.9,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.5,
      },
      humidity: {
        [HumidityRange.DRY]: 1.5, // высыхает
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.3, // плесень
        [HumidityRange.VERY_HUMID]: 2.0,
      },
      baseShelfLifeDays: 3,
      idealTemp: { min: 18, max: 22 },
      idealHumidity: { min: 50, max: 70 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ЗАМОРОЖЕННЫЕ ПРОДУКТЫ
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.FROZEN]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.1,
        [TemperatureRange.COLD]: 5.0, // критично!
        [TemperatureRange.COOL]: 10.0,
        [TemperatureRange.ROOM]: 20.0,
        [TemperatureRange.WARM]: 50.0,
      },
      humidity: {
        [HumidityRange.DRY]: 1.0,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.0,
        [HumidityRange.VERY_HUMID]: 1.0,
      },
      baseShelfLifeDays: 180,
      idealTemp: { min: -20, max: -18 },
      idealHumidity: { min: 90, max: 95 },
    },

    // ═══════════════════════════════════════════════════════════════
    // КОНСЕРВЫ И БАКАЛЕЯ — долгое хранение
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.SHELF_STABLE]: {
      temperature: {
        [TemperatureRange.FREEZER]: 0.5,
        [TemperatureRange.COLD]: 0.8,
        [TemperatureRange.COOL]: 0.9,
        [TemperatureRange.ROOM]: 1.0,
        [TemperatureRange.WARM]: 1.2,
      },
      humidity: {
        [HumidityRange.DRY]: 0.9,
        [HumidityRange.NORMAL]: 1.0,
        [HumidityRange.HUMID]: 1.2,
        [HumidityRange.VERY_HUMID]: 1.5,
      },
      baseShelfLifeDays: 365,
      idealTemp: { min: 10, max: 22 },
      idealHumidity: { min: 40, max: 60 },
    },

    // ═══════════════════════════════════════════════════════════════
    // ОБЩИЙ ПРЕСЕТ (по умолчанию)
    // ═══════════════════════════════════════════════════════════════
    [StoragePreset.GENERIC]: {
      temperature: BASE_TEMPERATURE_COEFFICIENTS,
      humidity: BASE_HUMIDITY_COEFFICIENTS,
      baseShelfLifeDays: 14,
      idealTemp: { min: 2, max: 8 },
      idealHumidity: { min: 70, max: 85 },
    },
  };

/**
 * Получить конфигурацию пресета
 */
export function getPresetConfig(preset: StoragePreset): PresetCoefficients {
  return STORAGE_PRESET_CONFIG[preset] ?? STORAGE_PRESET_CONFIG[StoragePreset.GENERIC];
}
