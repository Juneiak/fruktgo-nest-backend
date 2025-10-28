import { LogLevel, LogEntityType } from "./logs.enums";
import { UserType } from "src/common/enums/common.enum";


export class CreateLogCommand {
  constructor(
    public readonly payload: {
      entityType: LogEntityType,
      entityId: string,
      text: string,
      logLevel?: LogLevel,
      forRoles?: UserType[],
    },
    public readonly logId?: string,
  ) {}
}


export class DeleteAllEntityLogsCommand {
  constructor(
    public readonly payload: {
      entityType: LogEntityType,
      entityId: string,
    }
  ) {}
};