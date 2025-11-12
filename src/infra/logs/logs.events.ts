import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from './logs.service';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';

export const LOG_EVENTS = {
  CREATED: 'log.created',
  DELETED: 'log.deleted',
  ENTITY_LOGS_DELETED: 'log.entity_logs.deleted',
} as const;

@Injectable()
export class LogsEventsListener {
  constructor(
    private readonly logsService: LogsService
  ) { }

  @OnEvent(LOG_EVENTS.CREATED)
  async handleLogCreated(command: CreateLogCommand) {
    await this.logsService.createLog(command);
  }

  @OnEvent(LOG_EVENTS.DELETED)
  async handleLogDeleted(logId: string) {
    await this.logsService.deleteLog(logId);
  }

  @OnEvent(LOG_EVENTS.ENTITY_LOGS_DELETED)
  async handleEntityLogsDeleted(command: DeleteAllEntityLogsCommand) {
    await this.logsService.deleteAllEntityLogs(command);
  }
}