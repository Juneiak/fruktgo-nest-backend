import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateResult, Types } from 'mongoose';
import { DomainError } from 'src/common/errors';
import { ImportJob, ImportJobModel } from './import.schema';
import { ImportJobStatus, ImportDataType, ImportSourceType } from './import.enums';
import { CreateImportJobInput, ImportOptions, ImportResultSummary } from './import.types';
import { ExcelParser } from './parsers/excel.parser';
import { 
  WarehouseProductPort, 
  WAREHOUSE_PRODUCT_PORT,
  WarehouseProductCommands,
} from 'src/modules/warehouse-product';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
} from 'src/modules/shop-product';

@Injectable()
export class ImportService {
  constructor(
    @InjectModel(ImportJob.name) private readonly importJobModel: ImportJobModel,
    @Inject(WAREHOUSE_PRODUCT_PORT) private readonly warehouseProductPort: WarehouseProductPort,
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    private readonly excelParser: ExcelParser,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // IMPORT JOBS
  // ═══════════════════════════════════════════════════════════════

  async createImportJob(input: CreateImportJobInput): Promise<ImportJob> {
    const job = new this.importJobModel({
      seller: new Types.ObjectId(input.sellerId),
      sourceType: input.sourceType,
      dataType: input.dataType,
      fileName: input.fileName,
      filePath: input.filePath,
      targetWarehouse: input.targetWarehouseId ? new Types.ObjectId(input.targetWarehouseId) : undefined,
      targetShop: input.targetShopId ? new Types.ObjectId(input.targetShopId) : undefined,
      createdBy: input.createdById ? new Types.ObjectId(input.createdById) : undefined,
      status: ImportJobStatus.PENDING,
      result: {
        totalRows: 0,
        processedRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      },
    });

    const saved = await job.save();
    return saved.toObject({ virtuals: true });
  }

  async getImportJob(importJobId: string): Promise<ImportJob | null> {
    return this.importJobModel.findById(importJobId).lean({ virtuals: true });
  }

  async getImportJobs(
    sellerId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginateResult<ImportJob>> {
    return this.importJobModel.paginate(
      { seller: new Types.ObjectId(sellerId) },
      { page, limit, sort: { createdAt: -1 }, lean: true },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PROCESS IMPORT
  // ═══════════════════════════════════════════════════════════════

  async processImportJob(
    importJobId: string,
    fileBuffer: Buffer,
    options: ImportOptions = { updateExisting: true, createNew: true, skipErrors: true },
  ): Promise<ImportResultSummary> {
    const job = await this.importJobModel.findById(importJobId);
    if (!job) {
      throw DomainError.notFound('ImportJob', importJobId);
    }

    // Обновляем статус
    job.status = ImportJobStatus.PROCESSING;
    job.startedAt = new Date();
    await job.save();

    try {
      let result: ImportResultSummary;

      switch (job.dataType) {
        case ImportDataType.WAREHOUSE_STOCK:
          result = await this.processWarehouseStockImport(job, fileBuffer, options);
          break;
        case ImportDataType.SHOP_STOCK:
          result = await this.processShopStockImport(job, fileBuffer, options);
          break;
        case ImportDataType.PRODUCTS:
          result = await this.processProductsImport(job, fileBuffer, options);
          break;
        default:
          throw DomainError.validation(`Неподдерживаемый тип данных: ${job.dataType}`);
      }

      // Обновляем результат
      job.status = result.errorCount > 0 
        ? ImportJobStatus.COMPLETED_WITH_ERRORS 
        : ImportJobStatus.COMPLETED;
      job.result = result;
      job.completedAt = new Date();
      await job.save();

      return result;
    } catch (error) {
      job.status = ImportJobStatus.FAILED;
      job.result.errors.push({ message: error.message });
      job.completedAt = new Date();
      await job.save();
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WAREHOUSE STOCK IMPORT
  // ═══════════════════════════════════════════════════════════════

  private async processWarehouseStockImport(
    job: ImportJob,
    fileBuffer: Buffer,
    options: ImportOptions,
  ): Promise<ImportResultSummary> {
    if (!job.targetWarehouse) {
      throw DomainError.validation('Не указан целевой склад');
    }

    const { data, errors } = this.excelParser.parseStock(fileBuffer, options);
    
    const result: ImportResultSummary = {
      totalRows: data.length + errors.length,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: errors.length,
      errors: errors.map(e => ({ row: e.row, message: e.message })),
    };

    // Bulk upsert через порт
    // NOTE: Для полноценной реализации нужно сопоставить externalCode с productId
    // Пока просто помечаем как обработанные
    result.processedRows = data.length;
    result.skippedCount = data.length; // TODO: реализовать сопоставление

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // SHOP STOCK IMPORT
  // ═══════════════════════════════════════════════════════════════

  private async processShopStockImport(
    job: ImportJob,
    fileBuffer: Buffer,
    options: ImportOptions,
  ): Promise<ImportResultSummary> {
    if (!job.targetShop) {
      throw DomainError.validation('Не указан целевой магазин');
    }

    const { data, errors } = this.excelParser.parseStock(fileBuffer, options);
    
    const result: ImportResultSummary = {
      totalRows: data.length + errors.length,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: errors.length,
      errors: errors.map(e => ({ row: e.row, message: e.message })),
    };

    // TODO: реализовать сопоставление и обновление ShopProduct
    result.processedRows = data.length;
    result.skippedCount = data.length;

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCTS IMPORT
  // ═══════════════════════════════════════════════════════════════

  private async processProductsImport(
    job: ImportJob,
    fileBuffer: Buffer,
    options: ImportOptions,
  ): Promise<ImportResultSummary> {
    const { data, errors } = this.excelParser.parseProducts(fileBuffer, options);
    
    const result: ImportResultSummary = {
      totalRows: data.length + errors.length,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: errors.length,
      errors: errors.map(e => ({ row: e.row, message: e.message })),
    };

    // TODO: реализовать создание/обновление Product
    result.processedRows = data.length;
    result.skippedCount = data.length;

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════

  getProductsTemplate(): Buffer {
    return this.excelParser.getProductsTemplate();
  }

  getStockTemplate(): Buffer {
    return this.excelParser.getStockTemplate();
  }
}
