import { IssueUserType, IssueStatus, IssueCategory, IssueLevel } from "./issue.enums";
import { Issue } from "./issue.schema";

export class GetIssueQuery {
  constructor(
    public readonly issueId: string,
    public readonly options?: {
      select?: (keyof Issue)[]
    }
  ) {}
}

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
    public readonly options?: {
      select?: (keyof Issue)[]
    }
  ) {}
}