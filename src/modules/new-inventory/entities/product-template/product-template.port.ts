import { ProductTemplate } from './product-template.schema';
import * as Commands from './product-template.commands';
import * as Queries from './product-template.queries';

/**
 * Порт модуля ProductTemplate
 */
export interface ProductTemplatePort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /** Создать шаблон */
  create(command: Commands.CreateProductTemplateCommand): Promise<ProductTemplate>;

  /** Обновить шаблон */
  update(command: Commands.UpdateProductTemplateCommand): Promise<ProductTemplate>;

  /** Обновить настройки хранения */
  updateStorageSettings(
    command: Commands.UpdateStorageSettingsCommand,
  ): Promise<ProductTemplate>;

  /** Обновить настройки ценообразования */
  updatePricingSettings(
    command: Commands.UpdatePricingSettingsCommand,
  ): Promise<ProductTemplate>;

  /** Обновить настройки допусков */
  updateToleranceSettings(
    command: Commands.UpdateToleranceSettingsCommand,
  ): Promise<ProductTemplate>;

  /** Изменить статус */
  updateStatus(
    command: Commands.UpdateProductTemplateStatusCommand,
  ): Promise<ProductTemplate>;

  /** Добавить штрихкод */
  addBarcode(command: Commands.AddBarcodeCommand): Promise<ProductTemplate>;

  /** Удалить штрихкод */
  removeBarcode(command: Commands.RemoveBarcodeCommand): Promise<ProductTemplate>;

  /** Архивировать */
  archive(command: Commands.ArchiveProductTemplateCommand): Promise<ProductTemplate>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /** Получить по ID */
  getById(query: Queries.GetProductTemplateByIdQuery): Promise<ProductTemplate | null>;

  /** Получить по продавцу и товару */
  getByProduct(
    query: Queries.GetProductTemplateByProductQuery,
  ): Promise<ProductTemplate | null>;

  /** Получить все шаблоны продавца */
  getBySeller(
    query: Queries.GetProductTemplatesBySellerQuery,
  ): Promise<{ items: ProductTemplate[]; total: number }>;

  /** Поиск */
  search(
    query: Queries.SearchProductTemplatesQuery,
  ): Promise<{ items: ProductTemplate[]; total: number }>;

  /** Получить по штрихкоду */
  getByBarcode(
    query: Queries.GetProductTemplateByBarcodeQuery,
  ): Promise<ProductTemplate | null>;

  /** Получить по SKU */
  getBySku(
    query: Queries.GetProductTemplateBySkuQuery,
  ): Promise<ProductTemplate | null>;

  /** Получить количество */
  count(query: Queries.CountProductTemplatesQuery): Promise<number>;
}

export const PRODUCT_TEMPLATE_PORT = Symbol('PRODUCT_TEMPLATE_PORT');
