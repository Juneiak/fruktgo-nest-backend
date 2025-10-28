import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Log,LogModel } from './log.schema';
import { PaginateResult } from 'mongoose';
import { UserType } from "src/common/enums/common.enum";
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { GetEntityLogsQuery } from './logs.queries';
import { DomainError } from 'src/common/errors/domain-error';
import { checkId } from 'src/common/utils';
import { LogLevel } from './logs.enums';


@Injectable()
export class LogsService {
  constructor(
    @InjectModel(Log.name) private logModel: LogModel,
  ) {}
  
  // ====================================================
  // QUERIES
  // ====================================================
  async getEntityLogs(
    query: GetEntityLogsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Log>> {
    const { payload, filters } = query;
    checkId([payload.entityId]);

    const dbQueryFilter: any = {
      entityType: payload.entityType,
      entityId: new Types.ObjectId(payload.entityId),
      forRoles: payload.forRoles?.length ? { $in: payload.forRoles } : undefined,
    };
  
    if (filters) {
      if (filters.level) dbQueryFilter.logLevel = Array.isArray(filters.level) ? { $in: filters.level } : filters.level;
      if (filters.search) dbQueryFilter.text = { $regex: filters.search, $options: 'i' };
      if (filters.fromDate || filters.toDate) {
        dbQueryFilter.createdAt = {
          ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
          ...(filters.toDate ? { $lte: filters.toDate } : {}),
        };
      }
    }

    const dbQueryOptions: any = {
      page: queryOptions.pagination?.page || 1,
      limit: queryOptions.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: queryOptions.sort || { createdAt: -1 }
    };
    
    const result = await this.logModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getLog(
    logId: string,
    queryOptions: CommonQueryOptions
  ): Promise<Log | null> {
    checkId([logId]);
    
    const dbQuery = this.logModel.findOne({_id: new Types.ObjectId(logId)})
    if (queryOptions.session) dbQuery.session(queryOptions.session);

    const log = await dbQuery.lean({ virtuals: true }).exec();
    return log;
  }

  
  // ====================================================
  // COMMANDS
  // ====================================================
  async createLog(
    command: CreateLogCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Log> {
    const { payload, logId } = command;
    checkId([payload.entityId]);

    const logData: any = {
      _id: logId ? new Types.ObjectId(logId) : undefined,
      entityType: payload.entityType,
      entityId: new Types.ObjectId(payload.entityId),
      text: payload.text,
      logLevel: payload.logLevel || LogLevel.LOW,
      forRoles: [ 
        UserType.ADMIN,
        ...(payload.forRoles || [])
      ]
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const log = await this.logModel.create([logData], createOptions).then(docs => docs[0]);
    return log;
  }


  async deleteLog(
    logId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    checkId([logId]);

    const dbQueryFilter: any = {
      _id: new Types.ObjectId(logId),
    };
    
    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;
    
    const res = await this.logModel.deleteOne(dbQueryFilter, deleteOptions).exec();
    if (res.deletedCount === 0) throw DomainError.notFound('Log', String(logId));
  }


  async deleteAllEntityLogs(
    command: DeleteAllEntityLogsCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { payload } = command;
    checkId([payload.entityId]);
    
    const dbQueryFilter: any = {
      entityType: payload.entityType,
      entityId: new Types.ObjectId(payload.entityId)
    };
    
    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;
    
    await this.logModel.deleteMany(dbQueryFilter, deleteOptions).exec();
  }




  


}