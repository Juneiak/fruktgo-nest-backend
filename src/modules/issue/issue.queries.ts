import { IssueUserType, IssueStatus, IssueCategory, IssueLevel } from "./issue.enums";


export class GetIssuesQuery {
  constructor(
    public readonly filters?: {
      fromUserType?: IssueUserType;
      fromTelegramId?: number;
      fromUserId?: string;
      statuses?: IssueStatus[];
      categories?: IssueCategory[];
      levels?: IssueLevel[];
    },
  ) {}
}