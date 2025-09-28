import { UserType } from "src/common/enums/common.enum";
import { LogEntityType, LogLevel } from "../log.enums";

export class GetEntityLogsQuery {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly forRoles?: UserType[],
    public readonly level?: LogLevel | LogLevel[],
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
    public readonly search?: string,
  ) {}
}