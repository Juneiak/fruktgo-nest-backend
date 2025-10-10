import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Log,LogModel } from './log.schema';
import { PaginateResult } from 'mongoose';
import { UserType } from "src/common/enums/common.enum";
import { CreateLogCommand, DeleteAllEntityLogsCommand } from './logs.commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/comands';
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
  // COMMANDS
  // ====================================================
  /**
   * Создание лога
   */ 
  async createLog(
    command: CreateLogCommand,
    options?: CommonCommandOptions
  ): Promise<Log> {
    const { entityType, entityId, payload } = command;

    const logData: Omit<Log, '_id'> = {
      entityType,
      entityId: new Types.ObjectId(entityId),
      text: payload.text,
      logLevel: payload.logLevel || LogLevel.LOW,
      forRoles: [ 
        UserType.ADMIN,
        ...(payload.forRoles || [])
      ]
    };

    const queryOptions: any = {};
    if (options?.session) queryOptions.session = options.session;

    return await this.logModel.create([logData], queryOptions).then(docs => docs[0]);
  }


  /**
   * Удаление конкретного лога
   */
  async deleteLog(
    logId: string,
    options?: CommonCommandOptions
  ): Promise<void> {
    checkId([logId]);

    const filter: any = {
      _id: new Types.ObjectId(logId),
    };
    
    const queryOptions: any = {};
    if (options?.session) queryOptions.session = options.session;
    
    const res = await this.logModel.deleteOne(filter, queryOptions).exec();
    if (res.deletedCount === 0) throw DomainError.notFound('Log', String(filter._id));
  }


  /**
   * Удаление всех логов сущности
   */
  async deleteAllEntityLogs(
    command: DeleteAllEntityLogsCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    checkId([command.entityId]);
    
    const filter: any = {
      entityType: command.entityType,
      entityId: new Types.ObjectId(command.entityId)
    };
    
    const queryOptions: any = {};
    if (options?.session) queryOptions.session = options.session;
    
    await this.logModel.deleteMany(filter, queryOptions).exec();
  }




  // ====================================================
  // QUERIES
  // ====================================================
  /**
   * Получение всех логов для сущности с пагинацией
   */
  async getEntityLogs(
    query: GetEntityLogsQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Log>> {
    const { entityType, entityId, forRoles, filters } = query;
    checkId([entityId]);

    const filter: any = {
      entityType,
      entityId: new Types.ObjectId(entityId)
    };
  
    // Фильтрация по ролям (обязательное поле)
    if (forRoles?.length) filter.forRoles = { $in: forRoles };
    
    // Опциональные фильтры
    if (filters) {
      if (filters.level) {
        filter.logLevel = Array.isArray(filters.level) ? { $in: filters.level } : filters.level;
      }
      if (filters.fromDate || filters.toDate) {
        filter.createdAt = {
          ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
          ...(filters.toDate ? { $lte: filters.toDate } : {}),
        };
      }
      if (filters.search) {
        filter.text = { $regex: filters.search, $options: 'i' };
      }
    }

    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    return this.logModel.paginate(filter, queryOptions);
  }


  /**
   * Получение конкретного лога
   */
  async getLog(
    logId: string,
    options: CommonQueryOptions
  ): Promise<Log | null> {
    checkId([logId]);
    
    const query = this.logModel.findOne({_id: new Types.ObjectId(logId)})
    if (options.session) query.session(options.session);
    const log = await query.lean({ virtuals: true }).exec();
    
    return log;
  }


}