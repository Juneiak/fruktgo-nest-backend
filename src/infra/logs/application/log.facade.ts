import { Injectable } from '@nestjs/common';
import { ClientSession, PaginateResult } from 'mongoose';
import { LogService } from './log.service';
import { LogPort } from './log.port';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/query-options';
import { Log } from '../infrastructure/log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand, DeleteLogCommand } from './log.commands';
import { GetEntityLogsQuery } from './log.queries';

@Injectable()
export class LogFacade implements LogPort {
  constructor(private readonly logService: LogService) {}


  // ====================================================
  // COMMANDS
  // ====================================================
  async createLog(command: CreateLogCommand, options?: { session?: ClientSession }): Promise<Log> {
    return this.logService.createLog(command, { session: options?.session });
  }

  async deleteLog(command: DeleteLogCommand, options?: { session?: ClientSession }): Promise<boolean> {
    return this.logService.deleteLog(command, { session: options?.session });
  }

  async deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, options?: { session?: ClientSession }): Promise<boolean> {
    return this.logService.deleteAllEntityLogs(command, { session: options?.session });
  }


  // ====================================================
  // QUERIES
  // ====================================================
  async getEntityLogs(query: GetEntityLogsQuery, options?: CommonListQueryOptions): Promise<PaginateResult<Log>> {
    return this.logService.getEntityLogs(query, options ?? {});
  }

  async getLog(logId: string, options?: CommonQueryOptions): Promise<Log | null> {
    return this.logService.getLog(logId, options ?? {});
  }
}