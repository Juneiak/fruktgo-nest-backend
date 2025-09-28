import { PaginateResult } from 'mongoose';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/query-options';
import { Log } from '../infrastructure/log.schema';
import { CreateLogCommand, DeleteAllEntityLogsCommand, DeleteLogCommand } from './log.commands';
import { GetEntityLogsQuery } from './log.queries';
import { CommonCommandOptions } from 'src/common/types/comand-options';

export interface LogPort {
  // ====================================================
  // COMMANDS
  // ====================================================
  createLog(command: CreateLogCommand, options?: CommonCommandOptions): Promise<Log>;
  deleteLog(command: DeleteLogCommand, options?: CommonCommandOptions): Promise<boolean>;
  deleteAllEntityLogs(command: DeleteAllEntityLogsCommand, options?: CommonCommandOptions): Promise<boolean>;



  // ====================================================
  // QUERIES
  // ====================================================
  getEntityLogs(query: GetEntityLogsQuery, options?: CommonListQueryOptions): Promise<PaginateResult<Log>>;
  getLog(logId: string, options?: CommonQueryOptions): Promise<Log | null>;

}
