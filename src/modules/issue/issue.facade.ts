import { Injectable } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssuePort } from './issue.port';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { GetIssuesQuery } from './issue.queries';
import { Issue } from './issue.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class IssueFacade implements IssuePort {
  constructor(private readonly issueService: IssueService) {}

  // ====================================================
  // COMMANDS
  // ====================================================
  async createIssue(command: CreateIssueCommand, options: CommonCommandOptions): Promise<Issue> {
    return this.issueService.createIssue(command, options);
  }

  async updateIssue(command: UpdateIssueCommand, options: CommonCommandOptions): Promise<Issue> {
    return this.issueService.updateIssue(command, options);
  }

  // ====================================================
  // QUERIES
  // ====================================================
  async getIssue(issueId: string, options?: CommonQueryOptions): Promise<Issue | null> {
    return this.issueService.getIssue(issueId, options);
  }

  async getPaginatedIssues(query: GetIssuesQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Issue>> {
    return this.issueService.getPaginatedIssues(query, options);
  }
}