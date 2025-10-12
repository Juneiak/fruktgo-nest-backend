import { Types } from "mongoose";
import { ActorType } from "./shift.enums";

export interface ShiftFilter {
  shop?: Types.ObjectId;
  employee?: Types.ObjectId;
  openedAt?: {
    $gte?: Date;
    $lte?: Date;
  };
};

export class ShiftFilterBuilder {
  static from(dto: {
    shopId?: string;
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
  }): ShiftFilter {
    const filter: ShiftFilter = {};

    if (dto.shopId) filter.shop = new Types.ObjectId(dto.shopId);

    if (dto.employeeId) {
      filter['openedBy.actorType'] = ActorType.EMPLOYEE;
      filter['openedBy.actorId'] = new Types.ObjectId(dto.employeeId);
    }

    if (dto.startDate || dto.endDate) {
      filter.openedAt = {};
      if (dto.startDate) filter.openedAt.$gte = new Date(dto.startDate);
      if (dto.endDate) filter.openedAt.$lte = new Date(dto.endDate);
    }

    return filter;
  }
}


