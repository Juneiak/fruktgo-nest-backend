import { IssueUserType, IssueStatus, IssueLevel, IssueCategory } from "./issue.enums";

export class CreateIssueCommand {
  constructor(
    public readonly payload: {
      telegramId: number;
      userType: IssueUserType;
      userId: string;
      text: string;
      level?: IssueLevel;
      category: IssueCategory;
    },
    public readonly issueId?: string,
  ) {}
}


export class UpdateIssueCommand {
  constructor(
    public readonly issueId: string,
    public readonly payload: {
      resolution?: string | null;
      resolvedAt?: Date | null;
      status?: IssueStatus;
      level?: IssueLevel;
      category?: IssueCategory;
    },
  ) {}
}
