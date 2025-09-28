import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Log,LogModel } from '../infrastructure/log.schema';
import { PaginateResult } from 'mongoose';
import { UserType } from "src/common/enums/common.enum";
import { CreateLogCommand, DeleteAllEntityLogsCommand, DeleteLogCommand } from './log.commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/query-options';
import { CommonCommandOptions } from 'src/common/types/comand-options';
import { GetEntityLogsQuery } from './log.queries';



@Injectable()
export class LogService {
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
    options: CommonCommandOptions
  ): Promise<Log> {

    const logData = {
      entityType: command,
      entityId: new Types.ObjectId(command.entityId),
      text: command.text,
      logLevel: command.logLevel,
      forRoles: [ 
        UserType.ADMIN,
        ...(command.forRoles || [])
      ],
    }

    if (options.session) return await this.logModel.create([logData], { session: options.session }).then(docs => docs[0]);
    else return await this.logModel.create(logData);
  }


  /**
   * Удаление конкретного лога
   */
  async deleteLog(
    command: DeleteLogCommand,
    options: CommonCommandOptions
  ): Promise<boolean> {
    await this.logModel.deleteOne({
      _id: new Types.ObjectId(command.logId),
      entityType: command.entityType,
      entityId: new Types.ObjectId(command.entityId)
    }, { session: options.session || undefined }).exec();
    
    return true;
  }


  /**
   * Удаление всех логов сущности
   */
  async deleteAllEntityLogs(
    command: DeleteAllEntityLogsCommand,
    options: CommonCommandOptions
  ): Promise<boolean> {
    await this.logModel.deleteMany(
      {
        entityType: command.entityType,
        entityId: new Types.ObjectId(command.entityId)
      },
      { session: options.session || undefined })
      .exec();
    
    return true;
  }




  // ====================================================
  // QUERIES
  // ====================================================
  /**
   * Получение всех логов для сущности с пагинацией
   */
  async getEntityLogs(
    query: GetEntityLogsQuery,
    options: CommonListQueryOptions
  ): Promise<PaginateResult<Log>> {
    const page = options.pagination?.page ?? 1;
    const limit = options.pagination?.pageSize ?? 10;
    const sort = options.sort ?? { createdAt: -1 };
  
    const filter: any = {
      entityType: query.entityType,
      entityId: new Types.ObjectId(query.entityId),
    };
  
    if (query.forRoles?.length) filter.forRoles = { $in: query.forRoles };
    if (query.level) filter.logLevel = Array.isArray(query.level) ? { $in: query.level } : query.level;
    if (query.fromDate || query.toDate) {
      filter.createdAt = {
        ...(query.fromDate ? { $gte: query.fromDate } : {}),
        ...(query.toDate ? { $lte: query.toDate } : {}),
      };
    }
    if (query.search) filter.text = { $regex: query.search, $options: 'i' };
  
    return this.logModel.paginate(filter, {
      page, limit, sort, lean: true, leanWithId: false,
      options: options.session ? { session: options.session } : undefined,
    });
  }


  /**
   * Получение конкретного лога
   */
  async getLog(
    logId: string,
    options: CommonQueryOptions
  ): Promise<Log | null> {

    if (options.session) return await this.logModel.findById(new Types.ObjectId(logId)).lean({ virtuals: true }).session(options.session).exec();
    else return await this.logModel.findById(new Types.ObjectId(logId)).lean({ virtuals: true }).exec();    
  }


}