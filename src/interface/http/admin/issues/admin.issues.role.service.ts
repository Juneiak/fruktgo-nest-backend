import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import { IssuePreviewResponseDto, IssueFullResponseDto } from './admin.issues.response.dtos';
import { UpdateIssueDto } from './admin.issues.request.dtos';
import { IssueQueryDto } from './admin.issues.query.dtos';
import {
  IssuePort,
  ISSUE_PORT,
  IssueCommands,
  IssueQueries,
} from 'src/modules/issue';
import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto,
} from 'src/interface/http/common';


@Injectable()
export class AdminIssuesRoleService {
  constructor(
    @Inject(ISSUE_PORT) private readonly issuePort: IssuePort,
  ) {}

  async getIssues(
    authedAdmin: AuthenticatedUser,
    filterQuery: IssueQueryDto,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<IssuePreviewResponseDto>> {
    try {
      const query = new IssueQueries.GetIssuesQuery({
        fromUserType: filterQuery.userType,
        statuses: filterQuery.statuses,
        fromUserId: filterQuery.fromUserId,
      });
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationQuery
      };
      const result = await this.issuePort.getPaginatedIssues(query, queryOptions);
      
      return transformPaginatedResult(result, IssuePreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getIssue(
    authedAdmin: AuthenticatedUser,
    issueId: string
  ): Promise<IssueFullResponseDto> {
    try {
      const query = new IssueQueries.GetIssueQuery(issueId);
      const issue = await this.issuePort.getIssue(query);
      if (!issue) throw new NotFoundException('Обращение не найдено');

      return plainToInstance(IssueFullResponseDto, issue, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Обращение не найдено'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID обращения'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateIssue(
    authedAdmin: AuthenticatedUser,
    issueId: string,
    dto: UpdateIssueDto
  ): Promise<IssueFullResponseDto> {
    try {
      const command = new IssueCommands.UpdateIssueCommand(issueId, {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: dto.resolvedAt,
        level: dto.level,
        category: dto.category,
      });
      const updatedIssue = await this.issuePort.updateIssue(command);

      return plainToInstance(IssueFullResponseDto, updatedIssue, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Обращение не найдено'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID обращения'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных обращения'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}