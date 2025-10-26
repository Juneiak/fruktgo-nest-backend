import { Issue } from './issue.schema';
import { PaginateResult } from 'mongoose';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { GetIssuesQuery } from './issue.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface IssuePort {

  // ====================================================
  // COMMANDS
  // ==================================================== 
  createIssue(command: CreateIssueCommand, options: CommonCommandOptions): Promise<Issue>;
  updateIssue(command: UpdateIssueCommand, options: CommonCommandOptions): Promise<Issue>;

  // ====================================================
  // QUERIES
  // ==================================================== 
  getIssue(issueId: string, options?: CommonQueryOptions): Promise<Issue | null>;
  getPaginatedIssues(query: GetIssuesQuery, options: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Issue>>;
}

export const ISSUE_PORT = Symbol('ISSUE_PORT');