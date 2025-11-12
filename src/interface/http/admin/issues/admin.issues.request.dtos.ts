import { IsEnum, IsOptional, IsString, IsDate } from 'class-validator';
import { IssueStatus, IssueLevel, IssueCategory } from 'src/modules/issue/issue.enums';
import { Type } from 'class-transformer';

export class UpdateIssueDto {
  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsString()
  @IsOptional()
  resolution?: string | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  resolvedAt?: Date | null;

  @IsEnum(IssueLevel)
  @IsOptional()
  level?: IssueLevel;

  @IsEnum(IssueCategory)
  @IsOptional()
  category?: IssueCategory;
}