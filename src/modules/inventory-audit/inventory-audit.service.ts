import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult, FilterQuery } from 'mongoose';
import { InventoryAudit, InventoryAuditModel, InventoryAuditItem } from './inventory-audit.schema';
import { InventoryAuditStatus, InventoryAuditType } from './inventory-audit.enums';
import { InventoryAuditPort } from './inventory-audit.port';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { SHOP_PRODUCT_PORT, ShopProductPort, ShopProductQueries } from 'src/modules/shop-product';
import {
  CreateInventoryAuditCommand,
  StartInventoryAuditCommand,
  UpdateItemCountCommand,
  BulkUpdateItemCountsCommand,
  CompleteInventoryAuditCommand,
  CancelInventoryAuditCommand,
} from './inventory-audit.commands';
import {
  GetInventoryAuditQuery,
  GetInventoryAuditByDocumentNumberQuery,
  GetInventoryAuditsQuery,
  GetActiveInventoryAuditQuery,
} from './inventory-audit.queries';


@Injectable()
export class InventoryAuditService implements InventoryAuditPort {
  constructor(
    @InjectModel(InventoryAudit.name) private readonly inventoryAuditModel: InventoryAuditModel,
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getInventoryAudit(
    query: GetInventoryAuditQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null> {
    const { inventoryAuditId } = query;
    checkId([inventoryAuditId]);

    const dbQuery = this.inventoryAuditModel.findById(inventoryAuditId);
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const audit = await dbQuery.lean({ virtuals: true }).exec();
    return audit;
  }

  async getInventoryAuditByDocumentNumber(
    query: GetInventoryAuditByDocumentNumberQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null> {
    const dbQuery = this.inventoryAuditModel.findOne({ documentNumber: query.documentNumber });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const audit = await dbQuery.lean({ virtuals: true }).exec();
    return audit;
  }

  async getInventoryAudits(
    query: GetInventoryAuditsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<InventoryAudit>> {
    const { filters } = query;
    const filter: FilterQuery<InventoryAudit> = {};

    if (filters.shopId) {
      checkId([filters.shopId]);
      filter.shop = new Types.ObjectId(filters.shopId);
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.type) {
      filter.type = filters.type;
    }

    const paginateOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 20,
      sort: queryOptions?.sort || { createdAt: -1 },
      lean: true,
      leanWithId: false,
    };

    const result = await this.inventoryAuditModel.paginate(filter, paginateOptions);
    return result;
  }

  async getActiveInventoryAudit(
    query: GetActiveInventoryAuditQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<InventoryAudit | null> {
    checkId([query.shopId]);

    const dbQuery = this.inventoryAuditModel.findOne({
      shop: new Types.ObjectId(query.shopId),
      status: { $in: [InventoryAuditStatus.DRAFT, InventoryAuditStatus.IN_PROGRESS] },
    });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const audit = await dbQuery.lean({ virtuals: true }).exec();
    return audit;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createInventoryAudit(
    command: CreateInventoryAuditCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { payload } = command;
    checkId([payload.shopId, payload.createdById]);

    // Проверяем что нет активной инвентаризации
    const activeAudit = await this.getActiveInventoryAudit(
      new GetActiveInventoryAuditQuery(payload.shopId),
      commandOptions
    );
    if (activeAudit) {
      throw DomainError.invariant('Уже есть активная инвентаризация для этого магазина');
    }

    const documentNumber = await this.generateDocumentNumber();

    // Формируем список позиций
    let items: InventoryAuditItem[] = [];

    if (payload.type === InventoryAuditType.FULL) {
      // Для полной инвентаризации - берём все товары магазина
      const shopProducts = await this.shopProductPort.getShopProducts(
        new ShopProductQueries.GetShopProductsQuery({ shopId: payload.shopId }),
        { pagination: { page: 1, pageSize: 10000 } } // TODO: handle pagination properly
      );
      items = shopProducts.docs.map(sp => ({
        shopProduct: sp._id,
        expectedQuantity: sp.stockQuantity,
        isCounted: false,
      }));
    } else if (payload.shopProductIds && payload.shopProductIds.length > 0) {
      // Для частичной - берём указанные товары
      checkId(payload.shopProductIds);
      const shopProducts = await this.shopProductPort.getShopProductsByIds(
        new ShopProductQueries.GetShopProductsByIdsQuery(payload.shopProductIds),
        commandOptions
      );
      items = shopProducts.map(sp => ({
        shopProduct: sp._id,
        expectedQuantity: sp.stockQuantity,
        isCounted: false,
      }));
    }

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [audit] = await this.inventoryAuditModel.create([{
      documentNumber,
      shop: new Types.ObjectId(payload.shopId),
      status: InventoryAuditStatus.DRAFT,
      type: payload.type,
      items,
      totalItems: items.length,
      countedItems: 0,
      comment: payload.comment,
      createdBy: new Types.ObjectId(payload.createdById),
    }], createOptions);

    return audit.toObject({ virtuals: true });
  }

  async startInventoryAudit(
    command: StartInventoryAuditCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { inventoryAuditId, payload } = command;
    checkId([inventoryAuditId, payload.startedById]);

    const audit = await this.getInventoryAudit(new GetInventoryAuditQuery(inventoryAuditId), commandOptions);
    if (!audit) {
      throw DomainError.notFound('InventoryAudit', inventoryAuditId);
    }
    if (audit.status !== InventoryAuditStatus.DRAFT) {
      throw DomainError.invariant('Начать можно только черновик');
    }
    if (audit.items.length === 0) {
      throw DomainError.validation('Нельзя начать пустую инвентаризацию');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.inventoryAuditModel
      .findByIdAndUpdate(
        inventoryAuditId,
        {
          $set: {
            status: InventoryAuditStatus.IN_PROGRESS,
            startedBy: new Types.ObjectId(payload.startedById),
            startedAt: new Date(),
          },
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async updateItemCount(
    command: UpdateItemCountCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { inventoryAuditId, payload } = command;
    checkId([inventoryAuditId, payload.shopProductId]);

    const audit = await this.getInventoryAudit(new GetInventoryAuditQuery(inventoryAuditId), commandOptions);
    if (!audit) {
      throw DomainError.notFound('InventoryAudit', inventoryAuditId);
    }
    if (audit.status !== InventoryAuditStatus.IN_PROGRESS) {
      throw DomainError.invariant('Обновить подсчёт можно только в процессе инвентаризации');
    }

    const itemIndex = audit.items.findIndex(
      i => i.shopProduct.toString() === payload.shopProductId
    );
    if (itemIndex === -1) {
      throw DomainError.notFound('Позиция', payload.shopProductId);
    }

    const item = audit.items[itemIndex];
    const wasNotCounted = !item.isCounted;

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.inventoryAuditModel
      .findByIdAndUpdate(
        inventoryAuditId,
        {
          $set: {
            [`items.${itemIndex}.actualQuantity`]: payload.actualQuantity,
            [`items.${itemIndex}.difference`]: payload.actualQuantity - item.expectedQuantity,
            [`items.${itemIndex}.isCounted`]: true,
            [`items.${itemIndex}.comment`]: payload.comment,
          },
          ...(wasNotCounted ? { $inc: { countedItems: 1 } } : {}),
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async bulkUpdateItemCounts(
    command: BulkUpdateItemCountsCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { inventoryAuditId, items } = command;
    checkId([inventoryAuditId]);
    checkId(items.map(i => i.shopProductId));

    let audit = await this.getInventoryAudit(new GetInventoryAuditQuery(inventoryAuditId), commandOptions);
    if (!audit) {
      throw DomainError.notFound('InventoryAudit', inventoryAuditId);
    }
    if (audit.status !== InventoryAuditStatus.IN_PROGRESS) {
      throw DomainError.invariant('Обновить подсчёт можно только в процессе инвентаризации');
    }

    // Обновляем по одному (можно оптимизировать через bulkWrite)
    for (const item of items) {
      audit = await this.updateItemCount(
        new UpdateItemCountCommand(inventoryAuditId, item),
        commandOptions
      );
    }

    return audit;
  }

  async completeInventoryAudit(
    command: CompleteInventoryAuditCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { inventoryAuditId, payload } = command;
    checkId([inventoryAuditId, payload.completedById]);

    const audit = await this.getInventoryAudit(new GetInventoryAuditQuery(inventoryAuditId), commandOptions);
    if (!audit) {
      throw DomainError.notFound('InventoryAudit', inventoryAuditId);
    }
    if (audit.status !== InventoryAuditStatus.IN_PROGRESS) {
      throw DomainError.invariant('Завершить можно только инвентаризацию в процессе');
    }

    // Подсчитываем статистику
    let surplusItems = 0;
    let shortageItems = 0;
    let matchedItems = 0;

    for (const item of audit.items) {
      if (item.isCounted && item.difference !== undefined) {
        if (item.difference > 0) {
          surplusItems++;
        } else if (item.difference < 0) {
          shortageItems++;
        } else {
          matchedItems++;
        }
      }
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.inventoryAuditModel
      .findByIdAndUpdate(
        inventoryAuditId,
        {
          $set: {
            status: InventoryAuditStatus.COMPLETED,
            completedBy: new Types.ObjectId(payload.completedById),
            completedAt: new Date(),
            surplusItems,
            shortageItems,
            matchedItems,
          },
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async cancelInventoryAudit(
    command: CancelInventoryAuditCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<InventoryAudit> {
    const { inventoryAuditId, payload } = command;
    checkId([inventoryAuditId, payload.cancelledById]);

    const audit = await this.getInventoryAudit(new GetInventoryAuditQuery(inventoryAuditId), commandOptions);
    if (!audit) {
      throw DomainError.notFound('InventoryAudit', inventoryAuditId);
    }
    if (audit.status === InventoryAuditStatus.COMPLETED) {
      throw DomainError.invariant('Нельзя отменить завершённую инвентаризацию');
    }
    if (audit.status === InventoryAuditStatus.CANCELLED) {
      throw DomainError.invariant('Инвентаризация уже отменена');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.inventoryAuditModel
      .findByIdAndUpdate(
        inventoryAuditId,
        {
          $set: {
            status: InventoryAuditStatus.CANCELLED,
          },
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async generateDocumentNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `IA-${dateStr}-`;
    
    const lastDoc = await this.inventoryAuditModel
      .findOne({ documentNumber: { $regex: `^${prefix}` } })
      .sort({ documentNumber: -1 })
      .select('documentNumber')
      .lean()
      .exec();

    let nextNumber = 1;
    if (lastDoc?.documentNumber) {
      const lastNumber = parseInt(lastDoc.documentNumber.slice(-4), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }
}
