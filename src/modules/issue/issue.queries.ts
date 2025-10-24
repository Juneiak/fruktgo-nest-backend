import { IssueUserType, IssueStatus, IssueCategory, IssueLevel } from "./issue.enums";

export type GetIssuesFilters = {
  fromUserType?: IssueUserType;
  fromTelegramId?: number;
  statuses?: IssueStatus[];
  categories?: IssueCategory[];
  levels?: IssueLevel[];
};


export class GetIssuesQuery {
  constructor(
    public readonly filters?: GetIssuesFilters,
  ) {}
}