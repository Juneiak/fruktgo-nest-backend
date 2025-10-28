import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { ShiftModel, Shift } from './shift.schema';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { GetShiftsQuery } from './shift.queries';
import {
  OpenShiftCommand,
  CloseShiftCommand,
  StartClosingShiftCommand,
  PauseShiftCommand,
  ResumeShiftCommand,
  ForceCloseShiftCommand,
  AbandonShiftCommand,
  UpdateStatisticsCommand
} from './shift.commands';
import { ShiftStatus, ShiftEventType } from './shift.enums';
import { ShiftEvent } from './shift.schema';

// Матрица переходов между статусами смен
const SHIFT_STATUS_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  [ShiftStatus.OPEN]: [ShiftStatus.PAUSED, ShiftStatus.CLOSING, ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.PAUSED]: [ShiftStatus.OPEN, ShiftStatus.CLOSING, ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.CLOSING]: [ShiftStatus.CLOSED, ShiftStatus.ABANDONED],
  [ShiftStatus.CLOSED]: [], // Финальное состояние
  [ShiftStatus.ABANDONED]: [], // Финальное состояние
};

// Проверка возможности перехода
function canTransition(from: ShiftStatus, to: ShiftStatus): boolean {
  return SHIFT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// Валидация перехода
function validateTransition(currentStatus: ShiftStatus, newStatus: ShiftStatus, action: string): void {
  if (!canTransition(currentStatus, newStatus)) {
    throw new DomainError({
      code: 'INVARIANT',
      message: `Невозможно выполнить "${action}": переход из статуса "${currentStatus}" в "${newStatus}" недопустим`
    });
  }
}

@Injectable()
export class ShiftService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: ShiftModel,
  ) { }

  async getShifts(
    query: GetShiftsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Shift>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    if (filters?.shopId) dbQueryFilter.shop = new Types.ObjectId(filters.shopId);
    if (filters?.actorType && filters?.actorId) {
      dbQueryFilter.openedBy = {
        actorType: filters.actorType,
        actorId: new Types.ObjectId(filters.actorId)
      };
    }
    if (filters?.startDate) dbQueryFilter.openedAt = { $gte: filters.startDate };
    if (filters?.endDate) dbQueryFilter.openedAt = { $lte: filters.endDate };


    const dbQueryOptions: any = {
      page: queryOptions.pagination?.page || 1,
      limit: queryOptions.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions.sort || { createdAt: -1 }
    };
    
    const result = await this.shiftModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getShift(
    shiftId: string,
    queryOptions: CommonQueryOptions
  ): Promise<Shift | null> {
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(shiftId);
    if (queryOptions.session) dbQuery.session(queryOptions.session);

    const shift = await dbQuery.lean({ virtuals: true }).exec();
    return shift;
  }


  async getCurrentShiftOfShop(
    shopId: string,
    queryOptions: CommonQueryOptions
  ): Promise<Shift | null> {
    checkId([shopId]);

    const dbQuery = this.shiftModel
      .findOne({ shop: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 });
    
    if (queryOptions.session) dbQuery.session(queryOptions.session);

    const shift = await dbQuery.lean({ virtuals: true }).exec();
    return shift;
  }




  // ====================================================
  // COMMANDS
  // ====================================================

  async openShift(
    command: OpenShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shopId, payload } = command;
    checkId([shopId]);

    const shiftId = new Types.ObjectId();
    const openedAt = new Date();

    // Создаем событие открытия
    const openEvent: ShiftEvent = {
      type: ShiftEventType.OPEN,
      at: openedAt,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    // Создаем смену
    const shiftData: Omit<Shift, 'shiftId'> = {
      _id: shiftId,
      shop: new Types.ObjectId(shopId),
      status: ShiftStatus.OPEN,
      sla: payload.sla,
      statistics: {
        ordersCount: 0,
        deliveredOrdersCount: 0,
        canceledOrdersCount: 0,
        declinedOrdersCount: 0,
        totalIncome: 0,
        declinedIncome: 0,
        avgOrderPrice: 0,
        avgOrderAcceptanceDuration: 0,
        avgOrderAssemblyDuration: 0
      },
      openedBy: payload.actor,
      openedAt: openedAt,
      closedBy: null,
      closedAt: null,
      events: [openEvent],
      createdAt: openedAt,
      updatedAt: openedAt
    };

    const createOptions: any = {};
    if (options?.session) createOptions.session = options.session;

    const shift = await this.shiftModel.create([shiftData], createOptions).then(docs => docs[0]);
    return shift;
  }


  async closeShift(
    command: CloseShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.CLOSED, 'закрытие смены');

    const closedAt = new Date();

    // Добавляем событие закрытия
    const closeEvent: ShiftEvent = {
      type: ShiftEventType.CLOSE,
      at: closedAt,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    shift.status = ShiftStatus.CLOSED;
    shift.closedBy = payload.actor;
    shift.closedAt = closedAt;
    shift.events.push(closeEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async startClosing(
    command: StartClosingShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.CLOSING, 'начало закрытия');

    const now = new Date();

    // Добавляем событие начала закрытия
    const startClosingEvent: ShiftEvent = {
      type: ShiftEventType.START_CLOSING,
      at: now,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    shift.status = ShiftStatus.CLOSING;
    shift.events.push(startClosingEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async pauseShift(
    command: PauseShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.PAUSED, 'постановка на паузу');

    const now = new Date();

    // Добавляем событие паузы
    const pauseEvent: ShiftEvent = {
      type: ShiftEventType.PAUSE,
      at: now,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    shift.status = ShiftStatus.PAUSED;
    shift.events.push(pauseEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async resumeShift(
    command: ResumeShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.OPEN, 'возобновление смены');

    const now = new Date();

    // Добавляем событие возобновления
    const resumeEvent: ShiftEvent = {
      type: ShiftEventType.RESUME,
      at: now,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    shift.status = ShiftStatus.OPEN;
    shift.events.push(resumeEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async forceCloseShift(
    command: ForceCloseShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.CLOSED, 'принудительное закрытие');

    const closedAt = new Date();

    // Добавляем событие принудительного закрытия
    const forceCloseEvent: ShiftEvent = {
      type: ShiftEventType.FORCE_CLOSE,
      at: closedAt,
      by: payload.actor,
      comment: payload.comment || null,
      payload: {}
    };

    shift.status = ShiftStatus.CLOSED;
    shift.closedBy = payload.actor;
    shift.closedAt = closedAt;
    shift.events.push(forceCloseEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async abandonShift(
    command: AbandonShiftCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Валидация перехода через матрицу
    validateTransition(shift.status, ShiftStatus.ABANDONED, 'оставление смены');

    const now = new Date();

    // Добавляем событие оставления
    const abandonEvent: ShiftEvent = {
      type: ShiftEventType.ABANDON,
      at: now,
      by: payload.actor,
      comment: payload.reason || null,
      payload: {}
    };

    shift.status = ShiftStatus.ABANDONED;
    shift.events.push(abandonEvent);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }


  async updateStatistics(
    command: UpdateStatisticsCommand,
    options: CommonCommandOptions
  ): Promise<Shift> {
    const { shiftId, payload } = command;
    checkId([shiftId]);

    const dbQuery = this.shiftModel.findById(new Types.ObjectId(shiftId));
    if (options.session) dbQuery.session(options.session);

    const shift = await dbQuery.exec();
    if (!shift) throw new DomainError({ code: 'NOT_FOUND', message: 'Смена не найдена' });

    // Обновляем статистику через assignField
    assignField(shift.statistics, 'ordersCount', payload.ordersCount);
    assignField(shift.statistics, 'deliveredOrdersCount', payload.deliveredOrdersCount);
    assignField(shift.statistics, 'canceledOrdersCount', payload.canceledOrdersCount);
    assignField(shift.statistics, 'declinedOrdersCount', payload.declinedOrdersCount);
    assignField(shift.statistics, 'totalIncome', payload.totalIncome);
    assignField(shift.statistics, 'declinedIncome', payload.declinedIncome);
    assignField(shift.statistics, 'avgOrderPrice', payload.avgOrderPrice);
    assignField(shift.statistics, 'avgOrderAcceptanceDuration', payload.avgOrderAcceptanceDuration);
    assignField(shift.statistics, 'avgOrderAssemblyDuration', payload.avgOrderAssemblyDuration);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shift.save(saveOptions);
    return shift;
  }

}