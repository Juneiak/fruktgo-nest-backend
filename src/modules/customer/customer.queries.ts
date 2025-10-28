import { VerifiedStatus, UserSex, BlockStatus } from "src/common/enums/common.enum";

export class GetCustomersQuery {
  public readonly filters?: {
    verifiedStatuses?: VerifiedStatus[];
    blockedStatuses?: BlockStatus[];
    sexes?: UserSex[];
    fromBirthDate?: Date;
    toBirthDate?: Date;
  };
}

export class GetCustomerQuery {
  constructor(
    public readonly filter?: {
      customerId?: string,
      telegramId?: number,
      phone?: string,
      email?: string,
    },
  ) {}
}