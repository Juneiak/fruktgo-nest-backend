import { Issue } from './issue.schema';
import { PaginateResult } from 'mongoose';
import { CreateIssueCommand, UpdateIssueCommand } from './issue.commands';
import { GetIssuesQuery, GetIssueQuery } from './issue.queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

export interface IssuePort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getIssue(query: GetIssueQuery, queryOptions?: CommonQueryOptions): Promise<Issue | null>;
  getPaginatedIssues(query: GetIssuesQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Issue>>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createIssue(command: CreateIssueCommand, commandOptions?: CommonCommandOptions): Promise<Issue>;
  updateIssue(command: UpdateIssueCommand, commandOptions?: CommonCommandOptions): Promise<Issue>;
}

export const ISSUE_PORT = Symbol('ISSUE_PORT');