import { Types } from 'mongoose';
import {
  ProductCategory,
  ProductUnit,
  InventoryProductStatus,
  ShelfLifeType,
  ProductOrigin,
} from './inventory-product.enums';
import { StoragePreset } from '../../core/storage-preset/storage-preset.enums';

/**
 * Создать продукт
 */
export class CreateInventoryProductCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      name: string;
      description?: string;
      sku?: string;
      barcodes?: string[];
      category: ProductCategory;
      subcategory?: string;
      unit: ProductUnit;
      unitWeight?: number;
      origin?: ProductOrigin;
      countryOfOrigin?: string;
      storageRequirements?: {
        preset?: StoragePreset;
        minTemperature?: number;
        maxTemperature?: number;
        optimalTemperature?: number;
        minHumidity?: number;
        maxHumidity?: number;
        requiresRefrigeration?: boolean;
        requiresFreezing?: boolean;
        lightSensitive?: boolean;
        ethyleneSensitive?: boolean;
        producesEthylene?: boolean;
      };
      shelfLife: {
        type?: ShelfLifeType;
        baseDays: number;
        minDaysForReceiving?: number;
        degradationCoefficient?: number;
      };
      shrinkage?: {
        enabled?: boolean;
        percentPerDay?: number;
        maxPercent?: number;
      };
      tolerance?: {
        enabled?: boolean;
        percent?: number;
      };
      imageUrl?: string;
      gallery?: string[];
      masterProduct?: Types.ObjectId | string;
      tags?: string[];
      attributes?: Record<string, any>;
    },
  ) {}
}

/**
 * Обновить продукт
 */
export class UpdateInventoryProductCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      name?: string;
      description?: string;
      sku?: string;
      subcategory?: string;
      unitWeight?: number;
      origin?: ProductOrigin;
      countryOfOrigin?: string;
      imageUrl?: string;
      gallery?: string[];
      tags?: string[];
      attributes?: Record<string, any>;
    },
  ) {}
}

/**
 * Обновить условия хранения
 */
export class UpdateStorageRequirementsCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      preset?: StoragePreset;
      minTemperature?: number;
      maxTemperature?: number;
      optimalTemperature?: number;
      minHumidity?: number;
      maxHumidity?: number;
      requiresRefrigeration?: boolean;
      requiresFreezing?: boolean;
      lightSensitive?: boolean;
      ethyleneSensitive?: boolean;
      producesEthylene?: boolean;
    },
  ) {}
}

/**
 * Обновить настройки срока годности
 */
export class UpdateShelfLifeSettingsCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      type?: ShelfLifeType;
      baseDays?: number;
      minDaysForReceiving?: number;
      degradationCoefficient?: number;
    },
  ) {}
}

/**
 * Обновить настройки усушки
 */
export class UpdateShrinkageSettingsCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      enabled?: boolean;
      percentPerDay?: number;
      maxPercent?: number;
    },
  ) {}
}

/**
 * Обновить настройки допуска веса
 */
export class UpdateToleranceSettingsCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly data: {
      enabled?: boolean;
      percent?: number;
    },
  ) {}
}

/**
 * Изменить статус продукта
 */
export class ChangeProductStatusCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly status: InventoryProductStatus,
  ) {}
}

/**
 * Добавить штрих-код
 */
export class AddBarcodeCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Удалить штрих-код
 */
export class RemoveBarcodeCommand {
  constructor(
    public readonly productId: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Архивировать продукт
 */
export class ArchiveProductCommand {
  constructor(public readonly productId: Types.ObjectId | string) {}
}

/**
 * Импортировать продукт из мастер-каталога
 */
export class ImportFromMasterProductCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      masterProductId: Types.ObjectId | string;
      /** Переопределения */
      overrides?: {
        name?: string;
        sku?: string;
        shelfLife?: { baseDays: number };
      };
    },
  ) {}
}
