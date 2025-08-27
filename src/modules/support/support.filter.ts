import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IssueUserType, IssueStatusFilter } from './issue.schema';

export class IssueFilterDto {
  @ApiPropertyOptional({ description: 'ID клиента для фильтрации заказов' })
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
