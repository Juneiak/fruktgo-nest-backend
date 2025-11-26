/**
 * Shift Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseShiftResponseDto, [...])
 */

import { Expose, Type } from 'class-transformer';
import { Shift, ShiftActor, SlaSnapshot, ShiftStatistics, ShiftEvent } from 'src/modules/shift/shift.schema';
import { ActorType, ShiftEventType, ShiftStatus } from 'src/modules/shift/shift.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IShiftActor {
  actorType: ShiftActor['actorType'];
  actorId: string;
  actorName: ShiftActor['actorName'];
}

export interface ISlaSnapshot {
  acceptanceTimeLimit: SlaSnapshot['acceptanceTimeLimit'];
  assemblyTimeLimit: SlaSnapshot['assemblyTimeLimit'];
  minOrderSum: SlaSnapshot['minOrderSum'];
  openAt: SlaSnapshot['openAt'];
  closedAt: SlaSnapshot['closedAt'];
}

export interface IShiftStatistics {
  ordersCount: ShiftStatistics['ordersCount'];
  deliveredOrdersCount: ShiftStatistics['deliveredOrdersCount'];
  canceledOrdersCount: ShiftStatistics['canceledOrdersCount'];
  declinedOrdersCount: ShiftStatistics['declinedOrdersCount'];
  totalIncome: ShiftStatistics['totalIncome'];
  declinedIncome: ShiftStatistics['declinedIncome'];
  avgOrderPrice: ShiftStatistics['avgOrderPrice'];
  avgOrderAcceptanceDuration: ShiftStatistics['avgOrderAcceptanceDuration'];
  avgOrderAssemblyDuration: ShiftStatistics['avgOrderAssemblyDuration'];
}

export interface IShiftEvent {
  type: ShiftEvent['type'];
  at: ShiftEvent['at'];
  by: IShiftActor;
  comment?: ShiftEvent['comment'];
  payload?: ShiftEvent['payload'];
}

export interface IShiftResponse {
  shiftId: string;
  shop: string;
  status: Shift['status'];
  sla: ISlaSnapshot;
  statistics: IShiftStatistics;
  openedBy: IShiftActor;
  openedAt: Shift['openedAt'];
  closedBy: IShiftActor | null;
  closedAt: Shift['closedAt'];
  events: IShiftEvent[];
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseShiftActorDto implements IShiftActor {
  @Expose() actorType: ActorType;
  @ExposeObjectId() actorId: string;
  @Expose() actorName: string;
}

export class BaseSlaSnapshotDto implements ISlaSnapshot {
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minOrderSum: number;
  @Expose() openAt: Date;
  @Expose() closedAt: Date;
}

export class BaseShiftStatisticsDto implements IShiftStatistics {
  @Expose() ordersCount: number;
  @Expose() deliveredOrdersCount: number;
  @Expose() canceledOrdersCount: number;
  @Expose() declinedOrdersCount: number;
  @Expose() totalIncome: number;
  @Expose() declinedIncome: number;
  @Expose() avgOrderPrice: number;
  @Expose() avgOrderAcceptanceDuration: number;
  @Expose() avgOrderAssemblyDuration: number;
}

export class BaseShiftEventDto implements IShiftEvent {
  @Expose() type: ShiftEventType;
  @Expose() at: Date;
  @Expose() @Type(() => BaseShiftActorDto) by: BaseShiftActorDto;
  @Expose() comment?: string | null;
  @Expose() payload?: Record<string, unknown>;
}

export class BaseShiftResponseDto implements IShiftResponse {
  @Expose() shiftId: string;
  @ExposeObjectId() shop: string;
  @Expose() status: ShiftStatus;
  @Expose() @Type(() => BaseSlaSnapshotDto) sla: BaseSlaSnapshotDto;
  @Expose() @Type(() => BaseShiftStatisticsDto) statistics: BaseShiftStatisticsDto;
  @Expose() @Type(() => BaseShiftActorDto) openedBy: BaseShiftActorDto;
  @Expose() openedAt: Date;
  @Expose() @Type(() => BaseShiftActorDto) closedBy: BaseShiftActorDto | null;
  @Expose() closedAt: Date | null;
  @Expose() @Type(() => BaseShiftEventDto) events: BaseShiftEventDto[];
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
