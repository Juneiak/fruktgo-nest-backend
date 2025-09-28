import { LogLevel, LogEntityType } from "../log.enums";
import { UserType } from "src/common/enums/common.enum";

//create log
export class CreateLogCommand {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly text: string,
    public readonly logLevel?: LogLevel,
    public readonly forRoles?: UserType[],
  ) {}
}


//delete one log
export class DeleteLogCommand {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly logId: string,
  ) {}
};


//delete all entity logs
export class DeleteAllEntityLogsCommand {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
  ) {}
};