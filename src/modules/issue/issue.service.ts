import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { GetIssuesQuery } from './issue.queries';
import { Issue, IssueModel } from './issue.schema';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { IssueStatus, IssueLevel } from './issue.enums';

@Injectable()
export class IssueService {
  constructor(
    @InjectModel(Issue.name) private readonly issueModel: IssueModel,
  ) {}

  // ====================================================
  // COMMANDS
  // ====================================================

  async createIssue(
    command: CreateIssueCommand,
    options: CommonCommandOptions
  ): Promise<Issue> {
    const { payload } = command;

    const issueData = {
      _id: new Types.ObjectId(payload.issueId),
      fromUserType: payload.userType,
      from: new Types.ObjectId(payload.userId),
      issueText: payload.text,
      fromTelegramId: payload.telegramId,
      status: IssueStatus.NEW,
      category: payload.category,
      level: payload.level || IssueLevel.LOW,
      resolution: null,
      resolvedAt: null,
    };

    const createOptions: any = {};
    if (options?.session) createOptions.session = options.session;

    const issue = await this.issueModel.create([issueData], createOptions).then(docs => docs[0]);
    return issue;
  }
  

  async updateIssue(
    command: UpdateIssueCommand,
    options: CommonCommandOptions
  ): Promise<Issue> {
    const { issueId, payload } = command;
    checkId([issueId]);

    const dbQuery = this.issueModel.findById(new Types.ObjectId(issueId));
    if (options.session) dbQuery.session(options.session);

    const issue = await dbQuery.exec();
    if (!issue) throw new DomainError({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    
    // Обновляем поля через assignField
    assignField(issue, 'status', payload.status);
    assignField(issue, 'resolution', payload.resolution);
    assignField(issue, 'resolvedAt', payload.resolvedAt);
    assignField(issue, 'category', payload.category);
    assignField(issue, 'level', payload.level);
    
    
    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await issue.save(saveOptions);
    return issue;
  }
  
  
  // ====================================================
  // QUERIES
  // ====================================================

  async getIssue(
    issueId: string,
    options?: CommonQueryOptions,
  ): Promise<Issue | null> {
    checkId([issueId]);

    const dbQuery = this.issueModel.findById(new Types.ObjectId(issueId));
    if (options?.session) dbQuery.session(options.session);

    const issue = await dbQuery.lean({ virtuals: true }).exec();
    return issue;
  }
  

  async getPaginatedIssues(
    query: GetIssuesQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Issue>> {
    const { filters } = query;

    // Строим фильтр запроса
    const dbFilter: any = {};
    
    if (filters?.fromUserType) {
      dbFilter.fromUserType = filters.fromUserType;
    }
    
    if (filters?.fromTelegramId) {
      dbFilter.fromTelegramId = filters.fromTelegramId;
    }
    
    if (filters?.statuses && filters.statuses.length > 0) {
      dbFilter.status = { $in: filters.statuses };
    }

    if (filters?.categories && filters.categories.length > 0) {
      dbFilter.category = { $in: filters.categories };
    }

    if (filters?.levels && filters.levels.length > 0) {
      dbFilter.level = { $in: filters.levels };
    }

    // Пагинация
    const paginateOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };

    const result = await (this.issueModel as any).paginate(dbFilter, paginateOptions);
    return result;
  }
}