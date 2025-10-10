import { Injectable } from '@nestjs/common';
import { ClientSession, PaginateResult } from 'mongoose';
import { LogsService } from './logs.service';
import { LogsPort } from './logs.port';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Log } from '../infrastructure/log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { GetEntityLogsQuery } from './logs.queries';
import { CommonCommandOptions } from 'src/common/types/comands';

@Injectable()
export class LogsFacade implements LogsPort {
  constructor(private readonly logsService: LogsService) {}


  // ====================================================
  // COMMANDS
  // ====================================================
  async createLog(command: CreateLogCommand, options: CommonCommandOptions): Promise<Log> {
    return this.logsService.createLog(command, { session: options?.session });
  }

  async deleteLog(logId: string, options: CommonCommandOptions): Promise<void> {
    return this.logsService.deleteLog(logId, options);
  }

  async deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, options: CommonCommandOptions): Promise<void> {
    return this.logsService.deleteAllEntityLogs(command, options);
  }

  

  // ====================================================
  // QUERIES
  // ====================================================
  async getEntityLogs(query: GetEntityLogsQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Log>> {
    return this.logsService.getEntityLogs(query, options);
  }

  async getLog(logId: string, options: CommonQueryOptions): Promise<Log | null> {
    return this.logsService.getLog(logId, options);
  }
}