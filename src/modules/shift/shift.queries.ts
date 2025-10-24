import { ActorType } from "./shift.enums";

export type GetShiftsFilters = {
  shopId?: string;
  actorType?: ActorType;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
};

export class GetShiftsQuery {
  constructor(
    public readonly filters?: GetShiftsFilters,
  ) {}
}