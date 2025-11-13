import { BlockStatus, UserSex, VerifiedStatus } from "src/common/enums/common.enum";
import { EmployeeStatus } from "./employee.enums";
import { Employee } from "./employee.schema";
import { AtLeastOne } from "src/common/types/utility.types";

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
    public readonly options?: {
      select?: (keyof Employee)[]
    }
  ) {}
}

export class GetEmployeeQuery {
  constructor(
    /**
     * Фильтр для поиска сотрудника
     * Требуется хотя бы одно поле: employeeId, telegramId или phone
     */
    public readonly filter: AtLeastOne<{
      employeeId: string;
      telegramId: number;
      phone: string;
    }>,
    public readonly options?: {
      select?: (keyof Employee)[]
    }
  ) {}
}
  