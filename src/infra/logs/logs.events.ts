import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogsService } from './logs.service';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';

export const LOG_EVENTS = {
  CREATE_REQUESTED: 'log.create.requested',
  CREATE_COMPLETED: 'log.create.completed',

  DELETE_ONE_REQUESTED: 'log.delete.one.requested',
  DELETE_ONE_COMPLETED: 'log.delete.one.completed',

  DELETE_ENTITY_ALL_REQUESTED: 'log.delete.entity_all.requested',
  DELETE_ENTITY_ALL_COMPLETED: 'log.delete.entity_all.completed',
} as const;

export class CreateLogRequestedEvent { constructor(public readonly payload: CreateLogCommand) {} }
export class DeleteEntityAllRequestedEvent { constructor(public readonly payload: DeleteAllEntityLogsCommand) {} }

@Injectable()
export class LogsEventsListener {
  constructor(private readonly logsService: LogsService) {}

  @OnEvent(LOG_EVENTS.CREATE_COMPLETED)
  async handleCreateCompleted(e: CreateLogRequestedEvent) {
    await this.logsService.createLog(e.payload);
  }

  @OnEvent(LOG_EVENTS.DELETE_ONE_COMPLETED)
  async handleDeleteOneCompleted(e: string) {
    await this.logsService.deleteLog(e);
  }

  @OnEvent(LOG_EVENTS.DELETE_ENTITY_ALL_COMPLETED)
  async handleDeleteEntityAllCompleted(e: DeleteEntityAllRequestedEvent) {
    await this.logsService.deleteAllEntityLogs(e.payload);
  }
}