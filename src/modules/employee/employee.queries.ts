import { BlockStatus, UserSex, VerifiedStatus } from "src/common/enums/common.enum";
import { EmployeeStatus } from "./employee.enums";


export class GetEmployeesQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[],
      blockedStatuses?: BlockStatus[],
      sexes?: UserSex[],
      statuses?: EmployeeStatus[],
      sellerId?: string,
      shopId?: string,
    },

  ) {}
}

export class GetEmployeeQuery {
  constructor(
    public readonly filter?: {
      employeeId?: string,
      telegramId?: number,
      phone?: string,
    },
  ) {}
}
  