import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { checkId, assignField, selectFields } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { GetIssueQuery, GetIssuesQuery } from './issue.queries';
import { Issue, IssueModel } from './issue.schema';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { IssueStatus, IssueLevel } from './issue.enums';
import { IssuePort } from './issue.port';

@Injectable()
export class IssueService implements IssuePort {
  constructor(
    @InjectModel(Issue.name) private readonly issueModel: IssueModel,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getIssue(
    getIssueQuery: GetIssueQuery,
    queryOptions?: CommonQueryOptions,
  ): Promise<Issue | null> {
    checkId([getIssueQuery.issueId]);
    const { options } = getIssueQuery;

    const dbQuery = this.issueModel.findById(new Types.ObjectId(getIssueQuery.issueId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<Issue>(...options.select));
    }

    const issue = await dbQuery.lean({ virtuals: true }).exec();
    return issue;
  }
  

  async getPaginatedIssues(
    query: GetIssuesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Issue>> {
    const { filters, options } = query;

    const dbQueryFilter: any = {};
    if (filters?.fromUserType) dbQueryFilter.fromUserType = filters.fromUserType;
    if (filters?.fromTelegramId) dbQueryFilter.fromTelegramId = filters.fromTelegramId;
    if (filters?.fromUserId) dbQueryFilter.from = new Types.ObjectId(filters.fromUserId);
    if (filters?.statuses && filters.statuses.length > 0) dbQueryFilter.status = { $in: filters.statuses };
    if (filters?.categories && filters.categories.length > 0) dbQueryFilter.category = { $in: filters.categories };
    if (filters?.levels && filters.levels.length > 0) dbQueryFilter.level = { $in: filters.levels };

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };

    // Типобезопасный select - проверяется на этапе компиляции
    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<Issue>(...options.select);
    }

    const result = await this.issueModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createIssue(
    command: CreateIssueCommand,
    commandOptions?: CommonCommandOptions,
  ): Promise<Issue> {
    const { payload } = command;

    const issueData = {
      _id: command.issueId ? new Types.ObjectId(command.issueId) : new Types.ObjectId(),
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
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const issue = await this.issueModel.create([issueData], createOptions).then(docs => docs[0]);
    return issue;
  }
  

  async updateIssue(
    command: UpdateIssueCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Issue> {
    const { issueId, payload } = command;
    checkId([issueId]);

    const dbQuery = this.issueModel.findById(new Types.ObjectId(issueId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);

    const issue = await dbQuery.exec();
    if (!issue) throw DomainError.notFound('Issue', issueId);
    
    // Обновляем поля через assignField
    assignField(issue, 'status', payload.status);
    assignField(issue, 'resolution', payload.resolution);
    assignField(issue, 'resolvedAt', payload.resolvedAt);
    assignField(issue, 'category', payload.category);
    assignField(issue, 'level', payload.level);
    
    
    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;

    await issue.save(saveOptions);
    return issue;
  }
  
  

}