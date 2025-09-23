import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IssueUserType, IssueStatusFilter } from 'src/modules/support/issue.schema';

export class IssueQueryDto {  
  @ApiPropertyOptional({ description: 'Тип пользователя для фильтрации заявок' })
  @IsString()
  @IsOptional()
  userType?: IssueUserType;

  @ApiPropertyOptional({ enum: IssueStatusFilter, description: 'Статус заказа для фильтрации' })
  @IsEnum(IssueStatusFilter)
  @IsOptional()
  status?: IssueStatusFilter;

  @ApiPropertyOptional({ description: 'ID смены для фильтрации заказов' })
  @IsString()
  @IsOptional()
  userId?: string;
}
