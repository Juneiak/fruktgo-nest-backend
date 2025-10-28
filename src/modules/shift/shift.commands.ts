import { Actor, SlaSnapshot } from "./shift.schema";

export class OpenShiftCommand {
  constructor(
    public readonly shopId: string,
    public readonly payload: {
      sla: SlaSnapshot;
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class CloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class StartClosingShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class PauseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class ResumeShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class ForceCloseShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      comment?: string;
    },
  ) {}
}

export class AbandonShiftCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      actor: Actor;
      reason?: string;
    },
  ) {}
}

export class UpdateStatisticsCommand {
  constructor(
    public readonly shiftId: string,
    public readonly payload: {
      ordersCount?: number;
      deliveredOrdersCount?: number;
      canceledOrdersCount?: number;
      declinedOrdersCount?: number;
      totalIncome?: number;
      declinedIncome?: number;
      avgOrderPrice?: number;
      avgOrderAcceptanceDuration?: number;
      avgOrderAssemblyDuration?: number;
    },
  ) {}
}