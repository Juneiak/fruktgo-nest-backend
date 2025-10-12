import { IssueStatus } from "./issue.enums";

export const ISSUE_STATUS_DISPLAY_MAP: Record<string, string> = {
  [IssueStatus.NEW]: 'Новая',
  [IssueStatus.IN_PROGRESS]: 'В процессе',
  [IssueStatus.CLOSED]: 'Закрыта'
};