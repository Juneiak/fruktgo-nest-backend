import { ActorType } from "./shift.enums";
import { Shift } from "./shift.schema";

export class GetShiftsQuery {
  constructor(
    public readonly filters?: {
      shopId?: string;
      actorType?: ActorType;
      actorId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    public readonly options?: {
      select?: (keyof Shift)[],
    },
  ) {}
}

export class GetShiftQuery {
  constructor(
    public readonly shiftId: string,
    public readonly options?: {
      select?: (keyof Shift)[],
    },
  ) {}
}