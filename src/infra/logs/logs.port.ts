import { PaginateResult } from 'mongoose';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Log } from './log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { GetEntityLogsQuery } from './logs.queries';
import { CommonCommandOptions } from 'src/common/types/comands';

export interface LogsPort {
  // ====================================================
  // COMMANDS
  // ====================================================
  createLog(command: CreateLogCommand, options?: CommonCommandOptions): Promise<Log>;
  deleteLog(logId: string, options?: CommonCommandOptions): Promise<void>;
  deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, options?: CommonCommandOptions): Promise<void>;



  // ====================================================
  // QUERIES
  // ====================================================
  getEntityLogs(query: GetEntityLogsQuery, options?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Log>>;
  getLog(logId: string, options?: CommonQueryOptions): Promise<Log | null>;

}

export const LOGS_PORT = Symbol('LOGS_PORT');
