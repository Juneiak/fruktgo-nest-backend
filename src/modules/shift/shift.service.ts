// shift.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, PaginateResult, Types } from 'mongoose';
import { ShiftModel } from './shift.schema';

import { ShiftStatus, ShiftEventType, Actor, Shift } from './shift.schema';
import { ShopModel } from '../shop/shop.schema';
import { ShiftFilter } from './shift.types';
import { StandardCoreOptions } from 'src/common/types';
import { checkId } from 'src/common/utils';

const EVENTS_SLICE_KEEP = 200; // держим последние N событий

// матрица разрешённых переходов
const ALLOWED: Record<ShiftStatus, ShiftStatus[]> = {
  [ShiftStatus.OPEN]:    [ShiftStatus.PAUSED, ShiftStatus.CLOSING, ShiftStatus.CLOSED], // (close напрямую — на случай force_close)
  [ShiftStatus.PAUSED]:  [ShiftStatus.OPEN, ShiftStatus.CLOSING],
  [ShiftStatus.CLOSING]: [ShiftStatus.CLOSED],
  [ShiftStatus.CLOSED]:  [], // терминальное
  [ShiftStatus.ABANDONED]: [], // терминальное
};

// сопоставление перехода → тип события
const EVENT_FOR = {
  [`${ShiftStatus.OPEN}->${ShiftStatus.PAUSED}`]:  ShiftEventType.PAUSE,
  [`${ShiftStatus.PAUSED}->${ShiftStatus.OPEN}`]:  ShiftEventType.RESUME,
  [`${ShiftStatus.OPEN}->${ShiftStatus.CLOSING}`]: ShiftEventType.START_CLOSING,
  [`${ShiftStatus.PAUSED}->${ShiftStatus.CLOSING}`]: ShiftEventType.START_CLOSING,
  [`${ShiftStatus.CLOSING}->${ShiftStatus.CLOSED}`]: ShiftEventType.CLOSE,
  [`${ShiftStatus.OPEN}->${ShiftStatus.CLOSED}`]: ShiftEventType.FORCE_CLOSE, // прямое закрытие
} as const satisfies Partial<Record<`${ShiftStatus}->${ShiftStatus}`, ShiftEventType>>;

@Injectable()
export class ShiftService {
  constructor(
    @InjectModel('Shift') private readonly shiftModel: ShiftModel,
    @InjectModel('Shop') private readonly shopModel: ShopModel,
  ) {}

  // универсальный переход статуса + запись события
  private async transition(
    session: ClientSession,
    args: {
      shiftId: string;
      expect: ShiftStatus;      // guard: из какого статуса
      to: ShiftStatus;          // во что
      by: Actor;                // кто совершил
      comment?: string | null;
      payload?: Record<string, unknown>;
      also?: () => Promise<void>; // доп. побочный эффект (например, тронуть Shop)
    },
  ): Promise<void> {
    const { shiftId, expect, to, by, comment, payload, also } = args;

    // 1) проверка разрешённости перехода
    if (!ALLOWED[expect].includes(to)) {
      throw new BadRequestException(`Неверный переход: ${expect} → ${to}`);
    }

    const eventType = EVENT_FOR[`${expect}->${to}` as const];
    if (!eventType) throw new BadRequestException(`Неизвестный тип события для перехода ${expect} → ${to}`);

    // 2) апдейт c guard по текущему status
    const updateSet: Record<string, unknown> = { status: to };
    if (to === ShiftStatus.CLOSED) updateSet['sla.closedAt'] = new Date();

    const res = await this.shiftModel.updateOne(
      { _id: new Types.ObjectId(shiftId), status: expect },
      {
        $set: updateSet,
        $push: {
          events: {
            $each: [{
              type: eventType,
              at: new Date(),
              by: {
                actorType: by.actorType,
                actorId: new Types.ObjectId(by.actorId),
                actorName: by.actorName,
              },
              comment: comment ?? null,
              payload: payload ?? {},
            }],
            $slice: -EVENTS_SLICE_KEEP,
          },
        },
      },
      { session },
    );

    if (res.modifiedCount === 0) {
      // либо не тот текущий статус, либо смена не найдена
      const exists = await this.shiftModel.exists({ _id: shiftId }).session(session);
      if (!exists) throw new NotFoundException('Смена не найдена');
      throw new BadRequestException(`Ожидали статус "${expect}", но он другой — переход отклонён`);
    }

    // 3) побочные эффекты
    if (also) await also();
  }

  // ---------- публичные методы ----------


  async getShift(shiftId: string): Promise<Shift> {
    checkId([shiftId]);
    const shift = await this.shiftModel.findById(new Types.ObjectId(shiftId)).lean({ virtuals: true }).exec();
    if (!shift) throw new NotFoundException('Смена не найдена');
    return shift;
  };



  async getShifts(
    filter: ShiftFilter,
    options: StandardCoreOptions
  ): Promise<PaginateResult<Shift>> {
    const { page = 1, pageSize = 10, sortByDate = 'desc' } = options;
  
    return this.shiftModel.paginate(filter, {
      page,
      limit: pageSize,
      lean: true,
      leanWithId: false,
      sort: { createdAt: sortByDate === 'asc' ? 1 : -1 },
    });
  }


  async openShift(
    shopId: string,
    by: Actor,
    comment?: string | null,
  ) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        // создаём новую смену в статусе OPEN
        const shift = await this.shiftModel.create(
          [{
            shop: new Types.ObjectId(shopId),
            status: ShiftStatus.OPEN,
            openedAt: new Date(),
            openedBy: {
              actorType: by.actorType,
              actorId: by.actorId,
              actorName: by.actorName,
            },
            events: [{
              type: ShiftEventType.OPEN,
              at: new Date(),
              by: {
                actorType: by.actorType,
                actorId: by.actorId,
                actorName: by.actorName,
              },
              comment: comment ?? null,
              payload: {},
            }],
          }],
          { session },
        ).then(d => d[0]);

        // привязываем к магазину текущую смену
        await this.shopModel.updateOne(
          { _id: new Types.ObjectId(shopId) },
          { $set: { currentShift: shift._id, status: 'opened' } }, // если у Shop есть свой статус
          { session },
        );
      });
    } finally {
      session.endSession();
    }
  }


  async pauseShift(shiftId: string, by: Actor, comment?: string) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        await this.transition(session, {
          shiftId,
          expect: ShiftStatus.OPEN,
          to: ShiftStatus.PAUSED,
          by,
          comment,
        });
      });
    } finally {
      session.endSession();
    }
  }


  async resumeShift(shiftId: string, by: Actor, comment?: string) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        await this.transition(session, {
          shiftId,
          expect: ShiftStatus.PAUSED,
          to: ShiftStatus.OPEN,
          by,
          comment,
        });
      });
    } finally {
      session.endSession();
    }
  }


  async startClosing(shiftId: string, by: Actor, comment?: string) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        // можно стартовать из OPEN или PAUSED — выберем фактический
        const shift = await this.shiftModel
          .findById(shiftId)
          .select('status shop')
          .session(session);
        if (!shift) throw new NotFoundException('Смена не найдена');
        if (![ShiftStatus.OPEN, ShiftStatus.PAUSED].includes(shift.status as ShiftStatus)) {
          throw new BadRequestException('Закрытие можно начать только из OPEN/PAUSED');
        }

        await this.transition(session, {
          shiftId,
          expect: shift.status as ShiftStatus,
          to: ShiftStatus.CLOSING,
          by,
          comment,
        });
      });
    } finally {
      session.endSession();
    }
  }


  async closeShift(shiftId: string, by: Actor, comment?: string) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        // закрываем только из CLOSING
        const shift = await this.shiftModel
          .findById(shiftId)
          .select('status shop')
          .session(session);
        if (!shift) throw new NotFoundException('Смена не найдена');

        await this.transition(session, {
          shiftId,
          expect: ShiftStatus.CLOSING,
          to: ShiftStatus.CLOSED,
          by,
          comment,
          also: async () => {
            // отвяжем currentShift у магазина
            await this.shopModel.updateOne(
              { _id: shift.shop },
              { $set: { currentShift: null, status: 'closed' } },
              { session },
            );
          },
        });
      });
    } finally {
      session.endSession();
    }
  }


  // аварийное/прямое закрытие (по бизнес-правилам — только админу, например)
  async forceClose(shiftId: string, by: Actor, reason?: string) {
    const session = await this.shiftModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const shift = await this.shiftModel
          .findById(shiftId)
          .select('status shop')
          .session(session);
        if (!shift) throw new NotFoundException('Смена не найдена');
        if (shift.status === ShiftStatus.CLOSED) return; // уже закрыта

        await this.transition(session, {
          shiftId,
          expect: ShiftStatus.OPEN,         // guard на OPEN…
          to: ShiftStatus.CLOSED,
          by,
          comment: reason ?? 'force close',
          also: async () => {
            await this.shopModel.updateOne(
              { _id: shift.shop },
              { $set: { currentShift: null, status: 'closed' } },
              { session },
            );
          },
        }).catch(async (e) => {
          // если была PAUSED → CLOSED, можно разрешить альтернативный guard
          if (e instanceof BadRequestException && shift.status === ShiftStatus.PAUSED) {
            await this.transition(session, {
              shiftId,
              expect: ShiftStatus.PAUSED,
              to: ShiftStatus.CLOSED,
              by,
              comment: reason ?? 'force close',
              also: async () => {
                await this.shopModel.updateOne(
                  { _id: shift.shop },
                  { $set: { currentShift: null, status: 'closed' } },
                  { session },
                );
              },
            });
          } else {
            throw e;
          }
        });
      });
    } finally {
      session.endSession();
    }
  }
}