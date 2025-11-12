import { IssueStatus, IssueLevel, IssueCategory } from 'src/modules/issue/issue.enums';
import { Expose } from 'class-transformer';

export class IssueResponseDto {
  @Expose() issueId: string;
  @Expose() createdAt: Date;
  @Expose() issueText: string;
  @Expose() status: IssueStatus;
  @Expose() level: IssueLevel;
  @Expose() category?: IssueCategory;
  @Expose() resolution?: string | null;
  @Expose() resolvedAt?: Date | null;
}
