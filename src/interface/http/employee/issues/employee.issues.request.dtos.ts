import { IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { IssueCategory } from 'src/modules/issue/issue.enums';

export class CreateIssueDto {
  @IsString()
  @MinLength(10, { message: 'Текст обращения должен содержать минимум 10 символов' })
  @MaxLength(5000, { message: 'Текст обращения не должен превышать 5000 символов' })
  text: string;

  @IsEnum(IssueCategory)
  category: IssueCategory;
}
