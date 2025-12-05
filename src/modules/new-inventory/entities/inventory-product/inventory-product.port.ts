import { InventoryProduct } from './inventory-product.schema';
import * as Commands from './inventory-product.commands';
import * as Queries from './inventory-product.queries';

/**
 * Порт модуля InventoryProduct
 */
export interface InventoryProductPort {
  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Создать продукт
   */
  create(command: Commands.CreateInventoryProductCommand): Promise<InventoryProduct>;

  /**
   * Обновить продукт
   */
  update(command: Commands.UpdateInventoryProductCommand): Promise<InventoryProduct>;

  /**
   * Обновить условия хранения
   */
  updateStorageRequirements(
    command: Commands.UpdateStorageRequirementsCommand,
  ): Promise<InventoryProduct>;

  /**
   * Обновить настройки срока годности
   */
  updateShelfLifeSettings(
    command: Commands.UpdateShelfLifeSettingsCommand,
  ): Promise<InventoryProduct>;

  /**
   * Обновить настройки усушки
   */
  updateShrinkageSettings(
    command: Commands.UpdateShrinkageSettingsCommand,
  ): Promise<InventoryProduct>;

  /**
   * Обновить настройки допуска веса
   */
  updateToleranceSettings(
    command: Commands.UpdateToleranceSettingsCommand,
  ): Promise<InventoryProduct>;

  /**
   * Изменить статус
   */
  changeStatus(command: Commands.ChangeProductStatusCommand): Promise<InventoryProduct>;

  /**
   * Добавить штрих-код
   */
  addBarcode(command: Commands.AddBarcodeCommand): Promise<InventoryProduct>;

  /**
   * Удалить штрих-код
   */
  removeBarcode(command: Commands.RemoveBarcodeCommand): Promise<InventoryProduct>;

  /**
   * Архивировать продукт
   */
  archive(command: Commands.ArchiveProductCommand): Promise<InventoryProduct>;

  /**
   * Импортировать из мастер-каталога
   */
  importFromMaster(
    command: Commands.ImportFromMasterProductCommand,
  ): Promise<InventoryProduct>;

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Получить по ID
   */
  getById(query: Queries.GetProductByIdQuery): Promise<InventoryProduct | null>;

  /**
   * Получить по SKU
   */
  getBySku(query: Queries.GetProductBySkuQuery): Promise<InventoryProduct | null>;

  /**
   * Получить по штрих-коду
   */
  getByBarcode(query: Queries.GetProductByBarcodeQuery): Promise<InventoryProduct | null>;

  /**
   * Получить продукты продавца
   */
  getSellerProducts(
    query: Queries.GetSellerProductsQuery,
  ): Promise<{ items: InventoryProduct[]; total: number }>;

  /**
   * Поиск продуктов
   */
  search(query: Queries.SearchProductsQuery): Promise<InventoryProduct[]>;

  /**
   * Получить по категории
   */
  getByCategory(
    query: Queries.GetProductsByCategoryQuery,
  ): Promise<{ items: InventoryProduct[]; total: number }>;

  /**
   * Получить скоропортящиеся
   */
  getPerishable(query: Queries.GetPerishableProductsQuery): Promise<InventoryProduct[]>;

  /**
   * Получить с усушкой
   */
  getShrinkable(query: Queries.GetShrinkableProductsQuery): Promise<InventoryProduct[]>;

  /**
   * Получить требующие охлаждения
   */
  getRefrigerated(query: Queries.GetRefrigeratedProductsQuery): Promise<InventoryProduct[]>;

  /**
   * Получить по мастер-продукту
   */
  getByMaster(query: Queries.GetProductsByMasterQuery): Promise<InventoryProduct[]>;

  /**
   * Подсчитать продукты
   */
  count(query: Queries.CountProductsQuery): Promise<number>;

  /**
   * Проверить уникальность SKU
   */
  isSkuUnique(query: Queries.CheckSkuUniqueQuery): Promise<boolean>;

  /**
   * Проверить уникальность штрих-кода
   */
  isBarcodeUnique(query: Queries.CheckBarcodeUniqueQuery): Promise<boolean>;
}

export const INVENTORY_PRODUCT_PORT = Symbol('INVENTORY_PRODUCT_PORT');
