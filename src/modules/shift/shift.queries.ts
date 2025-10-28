import { ActorType } from "./shift.enums";

export class GetShiftsQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;
      actorType?: ActorType;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {}
}

export class GetShiftQuery {
  constructor(
    public readonly filter?: {
      shiftId?: string;
      shopId?: string;
    },
  ) {}
}