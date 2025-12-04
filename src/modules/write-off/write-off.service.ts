import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { WriteOff, WriteOffModel } from './write-off.schema';
import { WriteOffPort } from './write-off.port';
import { WriteOffStatus } from './write-off.enums';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors';
import {
  CreateWriteOffCommand,
  UpdateWriteOffCommand,
  ConfirmWriteOffCommand,
  CancelWriteOffCommand,
} from './write-off.commands';
import {
  GetWriteOffQuery,
  GetWriteOffsQuery,
  GetWriteOffByNumberQuery,
} from './write-off.queries';


@Injectable()
export class WriteOffService implements WriteOffPort {
  constructor(
    @InjectModel(WriteOff.name) private readonly writeOffModel: WriteOffModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getWriteOff(
    query: GetWriteOffQuery,
  ): Promise<WriteOff | null> {
    const { writeOffId, options } = query;
    checkId([writeOffId]);

    let dbQuery = this.writeOffModel.findById(new Types.ObjectId(writeOffId));
    
    if (options?.populateItems) {
      dbQuery = dbQuery.populate('items.shopProduct');
    }

    const writeOff = await dbQuery.lean({ virtuals: true }).exec();
    return writeOff;
  }


  async getWriteOffs(
    query: GetWriteOffsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>,
  ): Promise<PaginateResult<WriteOff>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    
    if (filters.shopId) {
      checkId([filters.shopId]);
      dbQueryFilter.shop = new Types.ObjectId(filters.shopId);
    }
    
    if (filters.status) {
      dbQueryFilter.status = filters.status;
    }
    
    if (filters.reason) {
      dbQueryFilter.reason = filters.reason;
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

    const result = await this.writeOffModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getWriteOffByNumber(
    query: GetWriteOffByNumberQuery,
  ): Promise<WriteOff | null> {
    const { documentNumber } = query;

    const writeOff = await this.writeOffModel
      .findOne({ documentNumber })
      .lean({ virtuals: true })
      .exec();

    return writeOff;
  }


  async generateDocumentNumber(shopId: string): Promise<string> {
    checkId([shopId]);
    
    // Формат: WO-YYYYMMDD-XXXX (где XXXX - порядковый номер за день)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const count = await this.writeOffModel.countDocuments({
      shop: new Types.ObjectId(shopId),
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    return `WO-${dateStr}-${sequence}`;
  }


  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createWriteOff(
    command: CreateWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff> {
    const { payload, writeOffId } = command;
    checkId([payload.shopId, payload.createdById, ...payload.items.map(i => i.shopProductId)]);

    const documentNumber = await this.generateDocumentNumber(payload.shopId);

    const writeOffData: any = {
      _id: writeOffId ? new Types.ObjectId(writeOffId) : new Types.ObjectId(),
      documentNumber,
      shop: new Types.ObjectId(payload.shopId),
      status: WriteOffStatus.DRAFT,
      reason: payload.reason,
      comment: payload.comment,
      createdBy: new Types.ObjectId(payload.createdById),
      items: payload.items.map(item => ({
        shopProduct: new Types.ObjectId(item.shopProductId),
        quantity: item.quantity,
        reason: item.reason,
        comment: item.comment,
        photos: item.photos || [],
      })),
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [writeOff] = await this.writeOffModel.create([writeOffData], createOptions);
    return writeOff;
  }


  async updateWriteOff(
    command: UpdateWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff> {
    const { writeOffId, payload } = command;
    checkId([writeOffId]);

    const writeOff = await this.writeOffModel.findById(new Types.ObjectId(writeOffId));
    if (!writeOff) {
      throw DomainError.notFound('WriteOff', writeOffId);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw DomainError.invariant('Можно редактировать только черновики', { status: writeOff.status });
    }

    const updateData: any = {};
    
    if (payload.reason) updateData.reason = payload.reason;
    if (payload.comment !== undefined) updateData.comment = payload.comment;
    
    if (payload.items) {
      checkId(payload.items.map(i => i.shopProductId));
      updateData.items = payload.items.map(item => ({
        shopProduct: new Types.ObjectId(item.shopProductId),
        quantity: item.quantity,
        reason: item.reason,
        comment: item.comment,
        photos: item.photos || [],
      }));
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.writeOffModel
      .findByIdAndUpdate(new Types.ObjectId(writeOffId), updateData, updateOptions)
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }


  async confirmWriteOff(
    command: ConfirmWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<WriteOff> {
    const { writeOffId, payload } = command;
    checkId([writeOffId, payload.confirmedById]);

    const writeOff = await this.writeOffModel.findById(new Types.ObjectId(writeOffId));
    if (!writeOff) {
      throw DomainError.notFound('WriteOff', writeOffId);
    }

    if (writeOff.status !== WriteOffStatus.DRAFT) {
      throw DomainError.invariant('Подтвердить можно только черновик', { status: writeOff.status });
    }

    if (writeOff.items.length === 0) {
      throw DomainError.validation('Документ списания не содержит позиций');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const confirmed = await this.writeOffModel
      .findByIdAndUpdate(
        new Types.ObjectId(writeOffId),
        {
          status: WriteOffStatus.CONFIRMED,
          confirmedBy: new Types.ObjectId(payload.confirmedById),
          confirmedAt: new Date(),
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return confirmed!;
  }


  async cancelWriteOff(
    command: CancelWriteOffCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<void> {
    const { writeOffId } = command;
    checkId([writeOffId]);

    const writeOff = await this.writeOffModel.findById(new Types.ObjectId(writeOffId));
    if (!writeOff) {
      throw DomainError.notFound('WriteOff', writeOffId);
    }

    if (writeOff.status === WriteOffStatus.CONFIRMED) {
      throw DomainError.invariant('Нельзя отменить уже подтверждённое списание');
    }

    const updateOptions: any = {};
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    await this.writeOffModel.updateOne(
      { _id: new Types.ObjectId(writeOffId) },
      { status: WriteOffStatus.CANCELLED },
      updateOptions
    );
  }
}
