import { Injectable } from '@nestjs/common';
import { PaginateResult } from 'mongoose';
import { LogsService } from './logs.service';
import { LogsPort } from './logs.port';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Log } from './log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { GetEntityLogsQuery } from './logs.queries';
import { CommonCommandOptions } from 'src/common/types/commands';

@Injectable()
export class LogsFacade implements LogsPort {
  constructor(private readonly logsService: LogsService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getEntityLogs(query: GetEntityLogsQuery, queryOptions: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Log>> {
    return this.logsService.getEntityLogs(query, queryOptions);
  }

  async getLog(logId: string, queryOptions: CommonQueryOptions): Promise<Log | null> {
    return this.logsService.getLog(logId, queryOptions);
  }

  
  // ====================================================
  // COMMANDS
  // ====================================================
  async createLog(command: CreateLogCommand, commandOptions: CommonCommandOptions): Promise<Log> {
    return this.logsService.createLog(command, commandOptions);
  }

  async deleteLog(logId: string, commandOptions: CommonCommandOptions): Promise<void> {
    return this.logsService.deleteLog(logId, commandOptions);
  }

  async deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, commandOptions: CommonCommandOptions): Promise<void> {
    return this.logsService.deleteAllEntityLogs(command, commandOptions);
  }
}