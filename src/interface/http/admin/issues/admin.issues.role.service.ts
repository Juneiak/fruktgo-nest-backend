import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
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

  }


  async getIssue(
    authedAdmin: AuthenticatedUser,
    issueId: string
  ): Promise<IssueFullResponseDto> {

    const query = new IssueQueries.GetIssueQuery(issueId);

    const issue = await this.issuePort.getIssue(query);
    if (!issue) throw new NotFoundException('Обращение не найдено');

    return plainToInstance(IssueFullResponseDto, issue, { excludeExtraneousValues: true });

  }


  async updateIssue(
    authedAdmin: AuthenticatedUser,
    issueId: string,
    dto: UpdateIssueDto
  ): Promise<IssueFullResponseDto> {

    const command = new IssueCommands.UpdateIssueCommand(issueId, {
      status: dto.status,
      resolution: dto.resolution,
      resolvedAt: dto.resolvedAt,
      level: dto.level,
      category: dto.category,
    });

    const updatedIssue = await this.issuePort.updateIssue(command);

    return plainToInstance(IssueFullResponseDto, updatedIssue, { excludeExtraneousValues: true });

  }
}