import { LogLevel, LogEntityType } from "./logs.enums";
import { UserType } from "src/common/enums/common.enum";

export type CreateLogPayload = {
  text: string,
  logLevel?: LogLevel,
  forRoles?: UserType[],
}

//create log
export class CreateLogCommand {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly payload: CreateLogPayload,
  ) {}
}


//delete all entity logs
export class DeleteAllEntityLogsCommand {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
  ) {}
};