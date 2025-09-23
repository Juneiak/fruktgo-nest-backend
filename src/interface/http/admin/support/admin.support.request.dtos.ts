import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IssueStatus, IssueLevel } from 'src/modules/support/issue.schema';

export class UpdateIssueDto {
  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsString()
  @IsOptional()
  result?: string | null;

  @IsEnum(IssueLevel)
  @IsOptional()
  level?: IssueLevel;
}