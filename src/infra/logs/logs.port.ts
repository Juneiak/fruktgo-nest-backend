import { PaginateResult } from 'mongoose';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { Log } from './log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { GetEntityLogsQuery } from './logs.queries';
import { CommonCommandOptions } from 'src/common/types/commands';

export interface LogsPort {

  // ====================================================
  // QUERIES
  // ====================================================
  getEntityLogs(query: GetEntityLogsQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Log>>;
  getLog(logId: string, queryOptions?: CommonQueryOptions): Promise<Log | null>;


  // ====================================================
  // COMMANDS
  // ====================================================
  createLog(command: CreateLogCommand, commandOptions?: CommonCommandOptions): Promise<Log>;
  deleteLog(logId: string, commandOptions?: CommonCommandOptions): Promise<void>;
  deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const LOGS_PORT = Symbol('LOGS_PORT');
