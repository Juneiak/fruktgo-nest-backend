import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { StockMovement, StockMovementModel } from './stock-movement.schema';
import { StockMovementPort } from './stock-movement.port';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { checkId } from 'src/common/utils';
import {
  CreateStockMovementCommand,
  BulkCreateStockMovementsCommand,
} from './stock-movement.commands';
import {
  GetStockMovementQuery,
  GetStockMovementsQuery,
  GetMovementsByDocumentQuery,
} from './stock-movement.queries';


@Injectable()
export class StockMovementService implements StockMovementPort {
  constructor(
    @InjectModel(StockMovement.name) private readonly stockMovementModel: StockMovementModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getStockMovement(
    query: GetStockMovementQuery,
  ): Promise<StockMovement | null> {
    const { stockMovementId } = query;
    checkId([stockMovementId]);

    const movement = await this.stockMovementModel
      .findById(new Types.ObjectId(stockMovementId))
      .lean({ virtuals: true })
      .exec();

    return movement;
  }


  async getStockMovements(
    query: GetStockMovementsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<StockMovement>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    
    if (filters.shopProductId) {
      checkId([filters.shopProductId]);
      dbQueryFilter.shopProduct = new Types.ObjectId(filters.shopProductId);
    }
    
    if (filters.shopId) {
      checkId([filters.shopId]);
      dbQueryFilter.shop = new Types.ObjectId(filters.shopId);
    }
    
    if (filters.types && filters.types.length > 0) {
      dbQueryFilter.type = { $in: filters.types };
    }
    
    if (filters.documentType) {
      dbQueryFilter['document.type'] = filters.documentType;
    }
    
    if (filters.documentId) {
      checkId([filters.documentId]);
      dbQueryFilter['document.id'] = new Types.ObjectId(filters.documentId);
    }
    
    if (filters.dateFrom || filters.dateTo) {
      dbQueryFilter.createdAt = {};
      if (filters.dateFrom) dbQueryFilter.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) dbQueryFilter.createdAt.$lte = filters.dateTo;
    }

    const dbQueryOptions: any = {
      page: queryOptions.pagination?.page || 1,
      limit: queryOptions.pagination?.pageSize || 20,
      lean: true,
      leanWithId: true,
      sort: queryOptions.sort || { createdAt: -1 },
    };

    const result = await this.stockMovementModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getMovementsByDocument(
    query: GetMovementsByDocumentQuery,
  ): Promise<StockMovement[]> {
    const { documentType, documentId } = query;
    checkId([documentId]);

    const movements = await this.stockMovementModel
      .find({
        'document.type': documentType,
        'document.id': new Types.ObjectId(documentId),
      })
      .sort({ createdAt: -1 })
      .lean({ virtuals: true })
      .exec();

    return movements;
  }


  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createStockMovement(
    command: CreateStockMovementCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<StockMovement> {
    const { payload, stockMovementId } = command;
    checkId([payload.shopProductId, payload.shopId]);

    const movementData: any = {
      _id: stockMovementId ? new Types.ObjectId(stockMovementId) : new Types.ObjectId(),
      type: payload.type,
      shopProduct: new Types.ObjectId(payload.shopProductId),
      shop: new Types.ObjectId(payload.shopId),
      quantity: payload.quantity,
      balanceBefore: payload.balanceBefore,
      balanceAfter: payload.balanceAfter,
      actor: {
        type: payload.actor.type,
        id: payload.actor.id ? new Types.ObjectId(payload.actor.id) : undefined,
        name: payload.actor.name,
      },
    };

    if (payload.document) {
      checkId([payload.document.id]);
      movementData.document = {
        type: payload.document.type,
        id: new Types.ObjectId(payload.document.id),
        number: payload.document.number,
      };
    }

    if (payload.writeOffReason) {
      movementData.writeOffReason = payload.writeOffReason;
    }

    if (payload.comment) {
      movementData.comment = payload.comment;
    }

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [movement] = await this.stockMovementModel.create([movementData], createOptions);
    return movement;
  }


  async bulkCreateStockMovements(
    command: BulkCreateStockMovementsCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<StockMovement[]> {
    const { items } = command;
    
    if (items.length === 0) return [];

    const movementDocs = items.map(item => {
      checkId([item.shopProductId, item.shopId]);
      
      const doc: any = {
        _id: new Types.ObjectId(),
        type: item.type,
        shopProduct: new Types.ObjectId(item.shopProductId),
        shop: new Types.ObjectId(item.shopId),
        quantity: item.quantity,
        balanceBefore: item.balanceBefore,
        balanceAfter: item.balanceAfter,
        actor: {
          type: item.actor.type,
          id: item.actor.id ? new Types.ObjectId(item.actor.id) : undefined,
          name: item.actor.name,
        },
      };

      if (item.document) {
        checkId([item.document.id]);
        doc.document = {
          type: item.document.type,
          id: new Types.ObjectId(item.document.id),
          number: item.document.number,
        };
      }

      if (item.writeOffReason) {
        doc.writeOffReason = item.writeOffReason;
      }

      if (item.comment) {
        doc.comment = item.comment;
      }

      return doc;
    });

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const movements = await this.stockMovementModel.create(movementDocs, createOptions);
    return movements;
  }
}
