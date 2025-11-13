import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { IssueUserType, IssueStatus } from 'src/modules/issue/issue.enums';

export class IssueQueryDto {  
  @IsOptional()
  @IsEnum(IssueUserType)
  userType?: IssueUserType;

  @IsOptional()
  @IsArray()
  @IsEnum(IssueStatus, { each: true })
  statuses?: IssueStatus[];

  @IsOptional()
  @IsString()
  fromUserId?: string;
}
