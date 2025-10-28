import { Injectable } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssuePort } from './issue.port';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { GetIssuesQuery } from './issue.queries';
import { Issue } from './issue.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class IssueFacade implements IssuePort {
  constructor(private readonly issueService: IssueService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getIssue(
    issueId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Issue | null> {
    return this.issueService.getIssue(issueId, queryOptions);
  }

  async getPaginatedIssues(
    query: GetIssuesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Issue>> {
    return this.issueService.getPaginatedIssues(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createIssue(
    command: CreateIssueCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Issue> {
    return this.issueService.createIssue(command, commandOptions);
  }

  async updateIssue(
    command: UpdateIssueCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Issue> {
    return this.issueService.updateIssue(command, commandOptions);
  }
}