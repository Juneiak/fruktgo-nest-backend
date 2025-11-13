import { VerifiedStatus, UserSex, BlockStatus } from "src/common/enums/common.enum";
import { Customer } from "./customer.schema";
import { AtLeastOne } from "src/common/types/utility.types";

export class GetCustomersQuery {
  constructor(
    public readonly filters?: {
      verifiedStatuses?: VerifiedStatus[];
      blockedStatuses?: BlockStatus[];
      sexes?: UserSex[];
      fromBirthDate?: Date;
      toBirthDate?: Date;
    },
    public readonly options?: {
      select?: (keyof Customer)[]
    }
  ) {}
}

export class GetCustomerQuery {
  constructor(
    public readonly filter: AtLeastOne<{
      customerId: string;
      telegramId: number;
      phone: string;
      email: string;
    }>,
    public readonly options?: {
      select?: (keyof Customer)[]
    }
  ) {}
}