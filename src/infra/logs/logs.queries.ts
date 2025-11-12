import { UserType } from "src/common/enums/common.enum";
import { LogEntityType, LogLevel } from "./logs.enums";

export class GetEntityLogsQuery {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly forRoles: UserType[],
    public readonly filters?: {
      level?: LogLevel | LogLevel[],
      fromDate?: Date,
      toDate?: Date,
      search?: string,
    },
  ) {}
}
