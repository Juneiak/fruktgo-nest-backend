import { IssueUserType, IssueStatus, IssueLevel, IssueCategory } from "./issue.enums";


export type CreateIssuePayload = {
  issueId?: string;
  telegramId: number;
  userType: IssueUserType;
  userId: string;
  text: string;
  level: IssueLevel;
  category: IssueCategory;
}

export class CreateIssueCommand {
  constructor(
    public readonly payload: CreateIssuePayload,
  ) {}
}

export type UpdateIssuePayload = {
  resolution?: string;
  resolvedAt?: Date;
  status?: IssueStatus;
  level?: IssueLevel;
  category?: IssueCategory;
}

export class UpdateIssueCommand {
  constructor(
    public readonly issueId: string,
    public readonly payload: UpdateIssuePayload,
  ) {}
}
