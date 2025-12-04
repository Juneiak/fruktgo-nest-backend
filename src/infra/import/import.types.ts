import { ImportSourceType, ImportDataType } from './import.enums';

// ═══════════════════════════════════════════════════════════════
// PARSED DATA TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Распарсенные данные товара
 */
export interface ParsedProduct {
  externalCode: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string; // шт, кг, г
  weight?: number;
  barcode?: string;
}

/**
 * Распарсенные данные остатка
 */
export interface ParsedStock {
  externalCode: string; // код товара
  productName?: string; // название для сопоставления
  barcode?: string;
  quantity: number;
  minStockLevel?: number;
}

/**
 * Распарсенные данные цены
 */
export interface ParsedPrice {
  externalCode: string;
  productName?: string;
  barcode?: string;
  price: number;
  oldPrice?: number;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT OPTIONS
// ═══════════════════════════════════════════════════════════════

export interface ImportOptions {
  /** Обновлять существующие записи */
  updateExisting: boolean;
  
  /** Создавать новые записи */
  createNew: boolean;
  
  /** Игнорировать ошибки и продолжать */
  skipErrors: boolean;
  
  /** Маппинг колонок (для Excel/CSV) */
  columnMapping?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT RESULT
// ═══════════════════════════════════════════════════════════════

export interface ImportResultSummary {
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{
    row?: number;
    field?: string;
    message: string;
    data?: Record<string, any>;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// CREATE IMPORT JOB
// ═══════════════════════════════════════════════════════════════

export interface CreateImportJobInput {
  sellerId: string;
  sourceType: ImportSourceType;
  dataType: ImportDataType;
  fileName: string;
  filePath: string;
  targetWarehouseId?: string;
  targetShopId?: string;
  createdById?: string;
}
