import { LogEntityType, LogLevel } from './logs.schema';
import { UserType } from 'src/common/enums/common.enum';

export class LogEvent {
  constructor(
    public readonly entityType: LogEntityType,
    public readonly entityId: string,
    public readonly text: string,
    public readonly logLevel: LogLevel = LogLevel.LOW,
    public readonly forRoles: UserType[] = [],
  ) {}
}