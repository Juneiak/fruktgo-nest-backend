import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult, FilterQuery } from 'mongoose';
import { Transfer, TransferModel, TransferItem } from './transfer.schema';
import { TransferStatus } from './transfer.enums';
import { TransferPort } from './transfer.port';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import {
  CreateTransferCommand,
  UpdateTransferCommand,
  SendTransferCommand,
  ReceiveTransferCommand,
  CancelTransferCommand,
} from './transfer.commands';
import {
  GetTransferQuery,
  GetTransferByDocumentNumberQuery,
  GetTransfersQuery,
  GetPendingTransfersForShopQuery,
} from './transfer.queries';


@Injectable()
export class TransferService implements TransferPort {
  constructor(
    @InjectModel(Transfer.name) private readonly transferModel: TransferModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getTransfer(
    query: GetTransferQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer | null> {
    const { transferId } = query;
    checkId([transferId]);

    const dbQuery = this.transferModel.findById(transferId);
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const transfer = await dbQuery.lean({ virtuals: true }).exec();
    return transfer;
  }

  async getTransferByDocumentNumber(
    query: GetTransferByDocumentNumberQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer | null> {
    const dbQuery = this.transferModel.findOne({ documentNumber: query.documentNumber });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const transfer = await dbQuery.lean({ virtuals: true }).exec();
    return transfer;
  }

  async getTransfers(
    query: GetTransfersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Transfer>> {
    const { filters } = query;
    const filter: FilterQuery<Transfer> = {};

    if (filters.sourceShopId) {
      checkId([filters.sourceShopId]);
      filter.sourceShop = new Types.ObjectId(filters.sourceShopId);
    }
    if (filters.targetShopId) {
      checkId([filters.targetShopId]);
      filter.targetShop = new Types.ObjectId(filters.targetShopId);
    }
    if (filters.status) {
      filter.status = filters.status;
    }

    const paginateOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 20,
      sort: queryOptions?.sort || { createdAt: -1 },
      lean: true,
      leanWithId: false,
    };

    const result = await this.transferModel.paginate(filter, paginateOptions);
    return result;
  }

  async getPendingTransfersForShop(
    query: GetPendingTransfersForShopQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Transfer[]> {
    checkId([query.targetShopId]);

    const dbQuery = this.transferModel.find({
      targetShop: new Types.ObjectId(query.targetShopId),
      status: TransferStatus.SENT,
    });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const transfers = await dbQuery.lean({ virtuals: true }).exec();
    return transfers;
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMANDS
  // ═══════════════════════════════════════════════════════════════

  async createTransfer(
    command: CreateTransferCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer> {
    const { payload } = command;
    checkId([payload.sourceShopId, payload.targetShopId, payload.createdById]);
    checkId(payload.items.map(i => i.shopProductId));

    if (payload.sourceShopId === payload.targetShopId) {
      throw DomainError.validation('Нельзя создать перемещение в тот же магазин');
    }

    const documentNumber = await this.generateDocumentNumber();

    const items: TransferItem[] = payload.items.map(item => ({
      shopProduct: new Types.ObjectId(item.shopProductId),
      quantity: item.quantity,
      comment: item.comment,
    }));

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const [transfer] = await this.transferModel.create([{
      documentNumber,
      sourceShop: new Types.ObjectId(payload.sourceShopId),
      targetShop: new Types.ObjectId(payload.targetShopId),
      status: TransferStatus.DRAFT,
      items,
      comment: payload.comment,
      createdBy: new Types.ObjectId(payload.createdById),
    }], createOptions);

    return transfer.toObject({ virtuals: true });
  }

  async updateTransfer(
    command: UpdateTransferCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer> {
    const { transferId, payload } = command;
    checkId([transferId]);

    const transfer = await this.getTransfer(new GetTransferQuery(transferId), commandOptions);
    if (!transfer) {
      throw DomainError.notFound('Transfer', transferId);
    }
    if (transfer.status !== TransferStatus.DRAFT) {
      throw DomainError.invariant('Можно редактировать только черновики');
    }

    const updateData: any = {};
    
    if (payload.items) {
      checkId(payload.items.map(i => i.shopProductId));
      updateData.items = payload.items.map(item => ({
        shopProduct: new Types.ObjectId(item.shopProductId),
        quantity: item.quantity,
        comment: item.comment,
      }));
    }
    if (payload.comment !== undefined) {
      updateData.comment = payload.comment;
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.transferModel
      .findByIdAndUpdate(transferId, { $set: updateData }, updateOptions)
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async sendTransfer(
    command: SendTransferCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer> {
    const { transferId, payload } = command;
    checkId([transferId, payload.sentById]);

    const transfer = await this.getTransfer(new GetTransferQuery(transferId), commandOptions);
    if (!transfer) {
      throw DomainError.notFound('Transfer', transferId);
    }
    if (transfer.status !== TransferStatus.DRAFT) {
      throw DomainError.invariant('Отправить можно только черновик');
    }
    if (transfer.items.length === 0) {
      throw DomainError.validation('Нельзя отправить пустое перемещение');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.transferModel
      .findByIdAndUpdate(
        transferId,
        {
          $set: {
            status: TransferStatus.SENT,
            sentBy: new Types.ObjectId(payload.sentById),
            sentAt: new Date(),
          },
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async receiveTransfer(
    command: ReceiveTransferCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer> {
    const { transferId, payload } = command;
    checkId([transferId, payload.receivedById]);

    const transfer = await this.getTransfer(new GetTransferQuery(transferId), commandOptions);
    if (!transfer) {
      throw DomainError.notFound('Transfer', transferId);
    }
    if (transfer.status !== TransferStatus.SENT) {
      throw DomainError.invariant('Принять можно только отправленное перемещение');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.transferModel
      .findByIdAndUpdate(
        transferId,
        {
          $set: {
            status: TransferStatus.RECEIVED,
            receivedBy: new Types.ObjectId(payload.receivedById),
            receivedAt: new Date(),
          },
        },
        updateOptions
      )
      .lean({ virtuals: true })
      .exec();

    return updated!;
  }

  async cancelTransfer(
    command: CancelTransferCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Transfer> {
    const { transferId, payload } = command;
    checkId([transferId, payload.cancelledById]);

    const transfer = await this.getTransfer(new GetTransferQuery(transferId), commandOptions);
    if (!transfer) {
      throw DomainError.notFound('Transfer', transferId);
    }
    if (transfer.status === TransferStatus.RECEIVED) {
      throw DomainError.invariant('Нельзя отменить уже принятое перемещение');
    }
    if (transfer.status === TransferStatus.CANCELLED) {
      throw DomainError.invariant('Перемещение уже отменено');
    }

    const updateOptions: any = { new: true };
    if (commandOptions?.session) updateOptions.session = commandOptions.session;

    const updated = await this.transferModel
      .findByIdAndUpdate(
        transferId,
        {
          $set: {
            status: TransferStatus.CANCELLED,
            cancelledBy: new Types.ObjectId(payload.cancelledById),
            cancelledAt: new Date(),
            cancelReason: payload.cancelReason,
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
    const prefix = `TR-${dateStr}-`;
    
    const lastDoc = await this.transferModel
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
