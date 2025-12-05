import { Types } from 'mongoose';
import {
  ProductTemplateStatus,
  PurchasePriceStrategy,
  ProductUnit,
} from './product-template.enums';
import { StoragePreset } from '../../core/storage-preset';

/**
 * Создать шаблон товара
 */
export class CreateProductTemplateCommand {
  constructor(
    public readonly data: {
      seller: Types.ObjectId | string;
      product: Types.ObjectId | string;
      productName: string;
      category?: Types.ObjectId | string;
      unit?: ProductUnit;
      storageSettings?: {
        preset?: StoragePreset;
        customShelfLifeDays?: number;
        shrinkageEnabled?: boolean;
        shrinkagePercentPerDay?: number;
      };
      pricingSettings?: {
        baseOnlinePrice?: number;
        baseOfflinePrice?: number;
        minMarkupPercent?: number;
        purchasePriceStrategy?: PurchasePriceStrategy;
        autoExpirationDiscounts?: boolean;
      };
      toleranceSettings?: {
        weightTolerance?: number;
      };
      barcodes?: string[];
      sku?: string;
      defaultSuppliers?: string[];
      notes?: string;
    },
  ) {}
}

/**
 * Обновить шаблон товара
 */
export class UpdateProductTemplateCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly data: {
      productName?: string;
      category?: Types.ObjectId | string;
      unit?: ProductUnit;
      barcodes?: string[];
      sku?: string;
      defaultSuppliers?: string[];
      notes?: string;
    },
  ) {}
}

/**
 * Обновить настройки хранения
 */
export class UpdateStorageSettingsCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly data: {
      preset?: StoragePreset;
      customShelfLifeDays?: number;
      shrinkageEnabled?: boolean;
      shrinkagePercentPerDay?: number;
    },
  ) {}
}

/**
 * Обновить настройки ценообразования
 */
export class UpdatePricingSettingsCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly data: {
      baseOnlinePrice?: number;
      baseOfflinePrice?: number;
      minMarkupPercent?: number;
      purchasePriceStrategy?: PurchasePriceStrategy;
      autoExpirationDiscounts?: boolean;
    },
  ) {}
}

/**
 * Обновить настройки допусков
 */
export class UpdateToleranceSettingsCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly data: {
      weightTolerance: number;
    },
  ) {}
}

/**
 * Изменить статус
 */
export class UpdateProductTemplateStatusCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly status: ProductTemplateStatus,
  ) {}
}

/**
 * Добавить штрихкод
 */
export class AddBarcodeCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Удалить штрихкод
 */
export class RemoveBarcodeCommand {
  constructor(
    public readonly templateId: Types.ObjectId | string,
    public readonly barcode: string,
  ) {}
}

/**
 * Удалить шаблон (архивировать)
 */
export class ArchiveProductTemplateCommand {
  constructor(public readonly templateId: Types.ObjectId | string) {}
}
