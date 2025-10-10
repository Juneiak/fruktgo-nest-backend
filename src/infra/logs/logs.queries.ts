import { UserType } from "src/common/enums/common.enum";
import { LogEntityType, LogLevel } from "./logs.enums";

export type GetEntityLogsFilters = {
  level?: LogLevel | LogLevel[],
  fromDate?: Date,
  toDate?: Date,
  search?: string,
};


export class GetEntityLogsQuery {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly forRoles: UserType[],
    public readonly filters?: GetEntityLogsFilters,
  ) {}
};
