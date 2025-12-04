import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { Receiving, ReceivingModel } from './receiving.schema';
import { ReceivingPort } from './receiving.port';
import { ReceivingStatus } from './receiving.enums';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors';
import {
  CreateReceivingCommand,
  UpdateReceivingCommand,
  ConfirmReceivingCommand,
  CancelReceivingCommand,
} from './receiving.commands';
import {
  GetReceivingQuery,
  GetReceivingsQuery,
  GetReceivingByNumberQuery,
} from './receiving.queries';


@Injectable()
export class ReceivingService implements ReceivingPort {
  constructor(
    @InjectModel(Receiving.name) private readonly receivingModel: ReceivingModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getReceiving(
    query: GetReceivingQuery,
  ): Promise<Receiving | null> {
    const { receivingId, options } = query;
    checkId([receivingId]);

    let dbQuery = this.receivingModel.findById(new Types.ObjectId(receivingId));
    
    if (options?.populateItems) {
      dbQuery = dbQuery.populate('items.shopProduct');
    }

    const receiving = await dbQuery.lean({ virtuals: true }).exec();
    return receiving;
  }


  async getReceivings(
    query: GetReceivingsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<Receiving>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    
    if (filters.shopId) {
      checkId([filters.shopId]);
      dbQueryFilter.shop = new Types.ObjectId(filters.shopId);
    }
    
    if (filters.status) {
      dbQueryFilter.status = filters.status;
    }
    
    if (filters.type) {
      dbQueryFilter.type = filters.type;
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

    const result = await this.receivingModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getReceivingByNumber(
    query: GetReceivingByNumberQuery,
  ): Promise<Receiving | null> {
    const { documentNumber } = query;

    const receiving = await this.receivingModel
      .findOne({ documentNumber })
      .lean({ virtuals: true })
      .exec();

    return receiving;
  }


  async generateDocumentNumber(shopId: string): Promise<string> {
    checkId([shopId]);
    
    // Формат: RC-YYYYMMDD-XXXX (где XXXX - порядковый номер за день)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const count = await this.receivingModel.countDocuments({
      shop: new Types.ObjectId(shopId),
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `RC-${dateStr}-${sequence}`;
  }


  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createReceiving(
    command: CreateReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving> {
    const { payload, receivingId } = command;
    checkId([payload.shopId, payload.createdById, ...payload.items.map(i => i.shopProductId)]);

    const documentNumber = await this.generateDocumentNumber(payload.shopId);

    const receivingData: any = {
      _id: receivingId ? new Types.ObjectId(receivingId) : new Types.ObjectId(),
      documentNumber,
      shop: new Types.ObjectId(payload.shopId),
      status: ReceivingStatus.DRAFT,
      type: payload.type,
      supplier: payload.supplier,
      supplierInvoice: payload.supplierInvoice,
      comment: payload.comment,
      createdBy: new Types.ObjectId(payload.createdById),
      items: payload.items.map(item => ({
        shopProduct: new Types.ObjectId(item.shopProductId),
        expectedQuantity: item.expectedQuantity,
        comment: item.comment,
      })),
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [receiving] = await this.receivingModel.create([receivingData], createOptions);
    return receiving;
  }


  async updateReceiving(
    command: UpdateReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving> {
    const { receivingId, payload } = command;
    checkId([receivingId]);

    const receiving = await this.receivingModel.findById(new Types.ObjectId(receivingId));
    if (!receiving) {
      throw DomainError.notFound('Receiving', receivingId);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw DomainError.invariant('Можно редактировать только черновики', { status: receiving.status });
    }

    const updateData: any = {};
    
    if (payload.type) updateData.type = payload.type;
    if (payload.supplier !== undefined) updateData.supplier = payload.supplier;
    if (payload.supplierInvoice !== undefined) updateData.supplierInvoice = payload.supplierInvoice;
    if (payload.comment !== undefined) updateData.comment = payload.comment;
    
    if (payload.items) {
      checkId(payload.items.map(i => i.shopProductId));
      updateData.items = payload.items.map(item => ({
        shopProduct: new Types.ObjectId(item.shopProductId),
        expectedQuantity: item.expectedQuantity,
        comment: item.comment,
      }));
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.receivingModel
      .findByIdAndUpdate(new Types.ObjectId(receivingId), updateData, updateOptions)
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }


  async confirmReceiving(
    command: ConfirmReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Receiving> {
    const { receivingId, payload } = command;
    checkId([receivingId, payload.confirmedById]);

    const receiving = await this.receivingModel.findById(new Types.ObjectId(receivingId));
    if (!receiving) {
      throw DomainError.notFound('Receiving', receivingId);
    }

    if (receiving.status !== ReceivingStatus.DRAFT) {
      throw DomainError.invariant('Подтвердить можно только черновик', { status: receiving.status });
    }

    if (receiving.items.length === 0) {
      throw DomainError.validation('Документ приёмки не содержит позиций');
    }

    // Обновляем фактические количества
    const itemsUpdate = receiving.items.map(item => {
      const actual = payload.actualItems.find(
        a => a.shopProductId === item.shopProduct.toString()
      );
      return {
        shopProduct: item.shopProduct,
        expectedQuantity: item.expectedQuantity,
        actualQuantity: actual?.actualQuantity ?? item.expectedQuantity,
        comment: item.comment,
      };
    });

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const confirmed = await this.receivingModel
      .findByIdAndUpdate(
        new Types.ObjectId(receivingId),
        {
          status: ReceivingStatus.CONFIRMED,
          confirmedBy: new Types.ObjectId(payload.confirmedById),
          confirmedAt: new Date(),
          items: itemsUpdate,
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return confirmed!;
  }


  async cancelReceiving(
    command: CancelReceivingCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<void> {
    const { receivingId } = command;
    checkId([receivingId]);

    const receiving = await this.receivingModel.findById(new Types.ObjectId(receivingId));
    if (!receiving) {
      throw DomainError.notFound('Receiving', receivingId);
    }

    if (receiving.status === ReceivingStatus.CONFIRMED) {
      throw DomainError.invariant('Нельзя отменить уже подтверждённую приёмку');
    }

    const updateOptions: any = {};
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    await this.receivingModel.updateOne(
      { _id: new Types.ObjectId(receivingId) },
      { status: ReceivingStatus.CANCELLED },
      updateOptions
    );
  }
}
