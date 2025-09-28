import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LogFacade } from './log.facade';
import { CreateLogCommand, DeleteAllEntityLogsCommand, DeleteLogCommand } from './log.commands';

export const LOG_EVENTS = {
  CREATE_REQUESTED: 'log.create.requested',
  CREATE_COMPLETED: 'log.create.completed',

  DELETE_ONE_REQUESTED: 'log.delete.one.requested',
  DELETE_ONE_COMPLETED: 'log.delete.one.completed',

  DELETE_ENTITY_ALL_REQUESTED: 'log.delete.entity_all.requested',
  DELETE_ENTITY_ALL_COMPLETED: 'log.delete.entity_all.completed',
} as const;

export class CreateLogRequestedEvent { constructor(public readonly payload: CreateLogCommand) {} }
export class DeleteOneRequestedEvent { constructor(public readonly payload: DeleteLogCommand) {} }
export class DeleteEntityAllRequestedEvent { constructor(public readonly payload: DeleteAllEntityLogsCommand) {} }

@Injectable()
export class LogEventsListener {
  constructor(private readonly logs: LogFacade) {}

  @OnEvent(LOG_EVENTS.CREATE_COMPLETED)
  async handleCreateCompleted(e: CreateLogRequestedEvent) {
    await this.logs.createLog(e.payload);
  }

  @OnEvent(LOG_EVENTS.DELETE_ONE_COMPLETED)
  async handleDeleteOneCompleted(e: DeleteOneRequestedEvent) {
    await this.logs.deleteLog(e.payload);
  }

  @OnEvent(LOG_EVENTS.DELETE_ENTITY_ALL_COMPLETED)
  async handleDeleteEntityAllCompleted(e: DeleteEntityAllRequestedEvent) {
    await this.logs.deleteAllEntityLogs(e.payload);
  }
}