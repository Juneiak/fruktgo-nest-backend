import { Actor, SlaSnapshot, Statistics } from "./shift.schema";

export type OpenShiftPayload = {
  sla: SlaSnapshot;
  actor: Actor;
  comment?: string;
}

export class OpenShiftCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: OpenShiftPayload,
  ) {}
}


export type CloseShiftPayload = {
  actor: Actor;
  comment?: string;
}

export class CloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: CloseShiftPayload,
  ) {}
}


export type StartClosingShiftPayload = {
  actor: Actor;
  comment?: string;
}

export class StartClosingShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: StartClosingShiftPayload,
  ) {}
}


export type PauseShiftPayload = {
  actor: Actor;
  comment?: string;
}

export class PauseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: PauseShiftPayload,
  ) {}
}


export type ResumeShiftPayload = {
  actor: Actor;
  comment?: string;
}

export class ResumeShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: ResumeShiftPayload,
  ) {}
}


export type ForceCloseShiftPayload = {
  actor: Actor;
  comment?: string;
}

export class ForceCloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: ForceCloseShiftPayload,
  ) {}
}


export type AbandonShiftPayload = {
  actor: Actor;
  reason?: string;
}

export class AbandonShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: AbandonShiftPayload,
  ) {}
}


export type UpdateStatisticsPayload = {
  ordersCount?: number;
  deliveredOrdersCount?: number;
  canceledOrdersCount?: number;
  declinedOrdersCount?: number;
  totalIncome?: number;
  declinedIncome?: number;
  avgOrderPrice?: number;
  avgOrderAcceptanceDuration?: number;
  avgOrderAssemblyDuration?: number;
}

export class UpdateStatisticsCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: UpdateStatisticsPayload,
  ) {}
}